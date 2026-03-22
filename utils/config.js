import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'loglevel';

log.setDefaultLevel('warn');

export const CONFIG_PATH = path.join(os.homedir(), '.ntcrc');
export const SERVER_URL = 'https://note-clone-one.vercel.app';

// Auto-refresh kalau sisa waktu < ini
const REFRESH_THRESHOLD_DAYS = 3;

// ─── Keytar ───────────────────────────────────────────────────────────────────
const KEYTAR_SERVICE = 'ntc-cli';
const KEYTAR_ACCOUNT = 'token';

let keytar = null;
let keytarWarned = false;

async function loadKeytar() {
    if (keytar !== null) return keytar;
    try {
        keytar = (await import('keytar')).default;
        return keytar;
    } catch {
        if (!keytarWarned) {
            log.warn('[ntc] keytar tidak tersedia — token disimpan di ~/.ntcrc');
            keytarWarned = true;
        }
        keytar = false;
        return null;
    }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function saveToken(token) {
    const kt = await loadKeytar();
    if (kt) {
        await kt.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, token);
        return true;
    }
    return false;
}

export async function getToken() {
    const kt = await loadKeytar();
    if (kt) return await kt.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    return null;
}

export async function deleteToken() {
    const kt = await loadKeytar();
    if (kt) await kt.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
}

// ─── Config file (~/.ntcrc) ───────────────────────────────────────────────────

function readConfigFile() {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        if (!raw.trim()) return null;
        return JSON.parse(raw);
    } catch (err) {
        log.error(`[ntc] Gagal baca config: ${err.message}`);
        return null;
    }
}

function writeConfigFile(data) {
    const safe = { ...data };
    delete safe.token;
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(safe, null, 2), { mode: 0o600 });
    } catch (err) {
        log.error(`[ntc] Gagal tulis config: ${err.message}`);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Simpan config setelah login.
 * Menerima: { token, expiresAt, email, username }
 */
export async function saveConfig(config) {
    const { token, expiresAt, ...meta } = config;
    const savedToKeychain = token ? await saveToken(token) : false;

    const fileData = savedToKeychain
        ? { ...meta, expiresAt }               // token di keychain, expiry di file
        : { ...meta, token, expiresAt };        // fallback: semua di file

    writeConfigFile(fileData);
}

export function getConfig() {
    return readConfigFile();
}

/**
 * Ambil config async + token dari keychain.
 * Sebelum return, cek apakah token perlu di-refresh.
 */
export async function getConfigAsync() {
    const file = readConfigFile();
    if (!file) return null;

    const keychainToken = await getToken();
    const token = keychainToken ?? file.token ?? null;
    if (!token) return null;

    const config = { ...file, token };

    // ── Auto-refresh jika token hampir expired ────────────────────────────────
    if (config.expiresAt) {
        const msLeft = new Date(config.expiresAt).getTime() - Date.now();
        const daysLeft = msLeft / (1000 * 60 * 60 * 24);

        if (daysLeft < 0) {
            // Sudah expired — jangan lanjut, paksa re-login
            return null;
        }

        if (daysLeft < REFRESH_THRESHOLD_DAYS) {
            // Hampir expired — refresh diam-diam
            const refreshed = await silentRefresh(token);
            if (refreshed) {
                return { ...config, token: refreshed.token, expiresAt: refreshed.expiresAt };
            }
        }
    }

    return config;
}

/**
 * Hapus semua data session.
 */
export async function deleteConfig() {
    await deleteToken();
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
}

// ─── Silent refresh ───────────────────────────────────────────────────────────

async function silentRefresh(currentToken) {
    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-refresh`, {
            headers: { Authorization: `Bearer ${currentToken}` },
        });

        if (!res.ok) return null;

        const { token, expiresAt } = await res.json();

        // Simpan token baru
        const savedToKeychain = await saveToken(token);
        const file = readConfigFile() ?? {};
        writeConfigFile(savedToKeychain
            ? { ...file, expiresAt }
            : { ...file, token, expiresAt }
        );

        log.info('[ntc] Token diperbarui otomatis.');
        return { token, expiresAt };

    } catch {
        log.warn('[ntc] Gagal refresh token — akan coba lagi di sesi berikutnya.');
        return null;
    }
}