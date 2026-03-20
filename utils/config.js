import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'loglevel';

log.setDefaultLevel('warn');

export const CONFIG_PATH = path.join(os.homedir(), '.ntcrc');
export const SERVER_URL = 'https://note-clone-one.vercel.app';

// ─── Keytar (opsional) ────────────────────────────────────────────────────────
// Keytar adalah native module — mungkin tidak tersedia di semua environment
// (CI, Docker, WSL tanpa secret service). Kalau gagal load, fallback ke
// plaintext di ~/.ntcrc dengan warning sekali saja.

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
            log.warn(
                '[ntc] keytar tidak tersedia — token disimpan di ~/.ntcrc (kurang aman).\n' +
                '      Install keytar untuk keamanan lebih: npm install keytar'
            );
            keytarWarned = true;
        }
        keytar = false; // tandai sudah dicoba, jangan retry terus
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
    return false; // caller akan simpan ke file sebagai fallback
}

export async function getToken() {
    const kt = await loadKeytar();
    if (kt) {
        return await kt.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    }
    return null; // caller ambil dari file
}

export async function deleteToken() {
    const kt = await loadKeytar();
    if (kt) {
        await kt.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    }
}

// ─── Config file (~/.ntcrc) ───────────────────────────────────────────────────
// Hanya menyimpan metadata NON-SENSITIF: email dan username.
// Token TIDAK disimpan di sini jika keytar tersedia.

function readConfigFile() {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        if (!raw.trim()) return null;
        return JSON.parse(raw);
    } catch (err) {
        log.error(`[ntc] Gagal baca config di ${CONFIG_PATH}:`, err.message);
        return null;
    }
}

function writeConfigFile(data) {
    // Pastikan tidak ada token tersimpan ke file kalau keytar tersedia
    const safe = { ...data };
    delete safe.token; // akan ditimpa nanti kalau keytar tidak ada
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(safe, null, 2), { mode: 0o600 });
    } catch (err) {
        log.error(`[ntc] Gagal tulis config ke ${CONFIG_PATH}:`, err.message);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Simpan config setelah login.
 * Token → keytar (atau ~/.ntcrc sebagai fallback).
 * email + username → ~/.ntcrc.
 */
export async function saveConfig(config) {
    const { token, ...meta } = config;

    // Coba simpan token ke keychain
    const savedToKeychain = token ? await saveToken(token) : false;

    // Simpan metadata ke file
    // Kalau keytar tidak ada, ikutkan token ke file sebagai fallback
    const fileData = savedToKeychain
        ? meta
        : { ...meta, token };

    writeConfigFile(fileData);
}

/**
 * Ambil config lengkap (sync untuk backward-compatibility dengan semua command).
 * Token diambil dari keychain secara async lalu di-merge ke config file.
 *
 * Catatan: fungsi ini sengaja SYNC untuk mempertahankan signature lama.
 * Token dari keytar diambil via getConfigAsync() untuk command yang butuh network.
 */
export function getConfig() {
    const file = readConfigFile();
    if (!file) return null;

    // Kembalikan apa yang ada di file — token bisa ada (fallback) atau tidak ada (keytar mode)
    // Command yang butuh token harus pakai getConfigAsync()
    return file;
}

/**
 * Versi async dari getConfig — merge token dari keychain.
 * Semua command yang memanggil fetch ke server HARUS pakai ini.
 */
export async function getConfigAsync() {
    const file = readConfigFile();
    if (!file) return null;

    // Coba ambil token dari keychain
    const keychainToken = await getToken();

    // Merge: keychain token prioritas, fallback ke token di file (mode lama)
    const token = keychainToken ?? file.token ?? null;

    if (!token) return null;

    return { ...file, token };
}

/**
 * Hapus semua data session (logout).
 */
export async function deleteConfig() {
    await deleteToken();
    if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
    }
}