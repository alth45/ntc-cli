import fs from 'fs';
import path from 'path';
import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

// ─── Helper: format timestamp ─────────────────────────────────────────────────
function timestamp() {
    return new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// ─── Helper: format file size ─────────────────────────────────────────────────
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}b`;
    return `${(bytes / 1024).toFixed(1)}kb`;
}

// ─── Core: upload satu file ke server ────────────────────────────────────────
export async function processSingleFile(fullPath, fileName, config, opts = {}) {
    const { silent = false } = opts;
    const rawContent = fs.readFileSync(fullPath, 'utf-8');

    if (!silent) {
        process.stdout.write(
            `${c.magenta}🚀 Menyiapkan: ${c.bright}[${fileName}.ntc]${c.reset}${c.magenta}...${c.reset}\n`
        );
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/ntc-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`
            },
            body: JSON.stringify({ title: fileName, rawContent })
        });

        const result = await response.json();

        if (response.ok) {
            if (!silent) {
                if (result.action === 'unchanged') {
                    console.log(`${c.yellow}ℹ️  [SKIPPED]${c.reset} Tidak ada perubahan.`);
                } else if (result.action === 'updated') {
                    console.log(`${c.green}${c.bright}✅ [UPDATED]${c.reset} ${c.green}Artikel diperbarui!${c.reset}`);
                } else {
                    console.log(`${c.green}${c.bright}✅ [CREATED]${c.reset} ${c.green}Artikel baru di-push!${c.reset}`);
                }
                console.log(`${c.cyan}🔗 Draft: ${c.gray}${SERVER_URL}/write/${result.postId}${c.reset}\n`);
            }
            return { ok: true, action: result.action, postId: result.postId };
        } else {
            if (!silent) {
                console.log(`${c.red}${c.bright}❌ [SERVER ERROR]${c.reset} ${c.red}${result.message}${c.reset}\n`);
            }
            return { ok: false, error: result.message };
        }
    } catch (error) {
        if (!silent) {
            console.log(`${c.red}${c.bright}❌ [NETWORK ERROR]${c.reset} ${c.red}Gagal menghubungi server.${c.reset}\n`);
        }
        return { ok: false, error: error.message };
    }
}

// ─── Watch mode ───────────────────────────────────────────────────────────────
async function watchFile(filePath, config) {
    if (!filePath || filePath === 'all') {
        console.log(`${c.red}❌ --watch butuh satu file spesifik.${c.reset}`);
        console.log(`${c.gray}   Contoh: ntc push catatan.ntc --watch${c.reset}\n`);
        process.exit(1);
    }

    if (!filePath.endsWith('.ntc')) {
        console.log(`${c.red}❌ File harus berekstensi .ntc${c.reset}\n`);
        process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`${c.red}❌ File tidak ditemukan: ${fullPath}${c.reset}\n`);
        process.exit(1);
    }

    const fileName = path.basename(filePath, '.ntc');
    const fileSize = () => formatSize(fs.statSync(fullPath).size);

    console.log(`\n${c.cyan}${c.bright}  ╔══════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}${c.bright}  ║        NTC WATCH MODE AKTIF          ║${c.reset}`);
    console.log(`${c.cyan}${c.bright}  ╚══════════════════════════════════════╝${c.reset}`);
    console.log(`\n  ${c.gray}File    :${c.reset} ${c.bright}${fileName}.ntc${c.reset}`);
    console.log(`  ${c.gray}Path    :${c.reset} ${c.gray}${fullPath}${c.reset}`);
    console.log(`  ${c.gray}Server  :${c.reset} ${c.cyan}${SERVER_URL}${c.reset}`);
    console.log(`  ${c.gray}Keluar  :${c.reset} ${c.yellow}Ctrl+C${c.reset}\n`);
    console.log(`  ${c.gray}─────────────────────────────────────${c.reset}\n`);

    // Push pertama saat watch dimulai
    process.stdout.write(`  ${c.gray}[${timestamp()}]${c.reset} Initial push... `);
    const initial = await processSingleFile(fullPath, fileName, config, { silent: true });
    if (initial.ok) {
        const actionLabel = initial.action === 'unchanged' ? `${c.yellow}tidak ada perubahan${c.reset}` : `${c.green}✓ synced${c.reset}`;
        console.log(actionLabel);
    } else {
        console.log(`${c.red}✗ gagal${c.reset}`);
    }

    // Debounce — cegah push dobel kalau editor save berkali-kali dalam 1 detik
    let debounceTimer = null;
    let pushCount = 0;
    let lastContent = fs.readFileSync(fullPath, 'utf-8');

    console.log(`\n  ${c.cyan}👀 Memantau perubahan...${c.reset}\n`);

    const watcher = fs.watch(fullPath, { persistent: true }, (eventType) => {
        if (eventType !== 'change') return;

        // Debounce 300ms — editor seperti VS Code kadang trigger beberapa event sekaligus
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            // Baca konten baru, skip kalau sama persis (beberapa editor save tanpa perubahan)
            let newContent;
            try {
                newContent = fs.readFileSync(fullPath, 'utf-8');
            } catch {
                return; // file sedang ditulis, skip cycle ini
            }

            if (newContent === lastContent) return;
            lastContent = newContent;

            process.stdout.write(
                `  ${c.gray}[${timestamp()}]${c.reset} Change detected (${fileSize()}) → pushing... `
            );

            const result = await processSingleFile(fullPath, fileName, config, { silent: true });

            if (result.ok) {
                pushCount++;
                const actionLabel = result.action === 'unchanged'
                    ? `${c.yellow}no-op${c.reset}`
                    : `${c.green}✓ synced${c.reset}`;
                console.log(`${actionLabel}  ${c.gray}(total: ${pushCount}x)${c.reset}`);
                console.log(`  ${c.gray}  └─ ${SERVER_URL}/write/${result.postId}${c.reset}`);
            } else {
                console.log(`${c.red}✗ gagal — ${result.error}${c.reset}`);
                console.log(`  ${c.yellow}  Akan coba lagi di perubahan berikutnya.${c.reset}`);
            }
        }, 300);
    });

    // Handle Ctrl+C dengan bersih
    process.on('SIGINT', () => {
        watcher.close();
        console.log(`\n\n  ${c.cyan}Watch mode dihentikan.${c.reset} ${c.gray}Total push: ${pushCount}x${c.reset}\n`);
        process.exit(0);
    });

    // Jaga process tetap hidup
    process.stdin.resume();
}

// ─── Public command ───────────────────────────────────────────────────────────
export async function pushFile(filePath, flags = {}) {
    const config = getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Belum login. Gunakan: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    if (!filePath) {
        console.log(`${c.red}❌ Error: Masukkan argumen yang valid!${c.reset}\n${c.gray}(Contoh: ntc push draf.ntc ATAU ntc push all)${c.reset}`);
        process.exit(1);
    }

    // ── Watch mode ────────────────────────────────────────────────────────
    if (flags.watch || flags.w) {
        return watchFile(filePath, config);
    }

    // ── Push all ──────────────────────────────────────────────────────────
    if (filePath.toLowerCase() === 'all') {
        console.log(`${c.cyan}🔍 Memindai direktori untuk file .ntc...${c.reset}`);

        const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.ntc'));

        if (files.length === 0) {
            console.log(`${c.yellow}⚠️  Tidak ada file .ntc ditemukan.${c.reset}`);
            return;
        }

        console.log(`${c.cyan}🚀 ${files.length} file ditemukan. Memulai sinkronisasi...${c.reset}\n`);

        let successCount = 0;
        for (const file of files) {
            const fullPath = path.resolve(process.cwd(), file);
            const fileName = path.basename(file, '.ntc');
            const result = await processSingleFile(fullPath, fileName, config);
            if (result.ok) successCount++;
        }

        console.log(`${c.green}${c.bright}✅ Selesai! ${successCount}/${files.length} file berhasil di-sync.${c.reset}`);
        return;
    }

    // ── Push single file ──────────────────────────────────────────────────
    if (!filePath.endsWith('.ntc')) {
        console.log(`${c.red}❌ Error: File harus berekstensi .ntc!${c.reset}\n${c.gray}(Contoh: ntc push draf.ntc)${c.reset}`);
        process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        console.log(`${c.red}❌ Error: File tidak ditemukan: ${fullPath}${c.reset}`);
        process.exit(1);
    }

    const fileName = path.basename(filePath, '.ntc');
    await processSingleFile(fullPath, fileName, config);
}