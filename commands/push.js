import fs from 'fs';
import path from 'path';
import { c } from '../utils/theme.js';
import { SERVER_URL, getConfig } from '../utils/config.js';

// --- FUNGSI HELPER: Buat ngurusin upload 1 file (biar bisa di-looping) ---
async function processSingleFile(fullPath, fileName, config) {
    const rawContent = fs.readFileSync(fullPath, 'utf-8');

    console.log(`${c.magenta}🚀 Menyiapkan peluncuran untuk: ${c.bright}[${fileName}.ntc]${c.reset}${c.magenta}...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/ntc-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`
            },
            body: JSON.stringify({ title: fileName, rawContent: rawContent })
        });

        const result = await response.json();

        if (response.ok) {
            if (result.action === "unchanged") {
                console.log(`${c.yellow}ℹ️  [SKIPPED] File tidak memiliki perubahan. Tidak ada data yang ditimpa.${c.reset}`);
            } else if (result.action === "updated") {
                console.log(`${c.green}${c.bright}✅ [UPDATED]${c.reset} ${c.green}Artikel lama berhasil ditimpa/diperbarui!${c.reset}`);
            } else {
                console.log(`${c.green}${c.bright}✅ [CREATED]${c.reset} ${c.green}Artikel baru berhasil di-push ke NoteOS!${c.reset}`);
            }
            console.log(`${c.cyan}🔗 Link Draft: ${c.gray}${SERVER_URL}/write/${result.postId}${c.reset}\n`); // Tambah \n biar rapi pas di-loop
            return true;
        } else {
            console.log(`${c.red}${c.bright}❌ [SERVER ERROR]${c.reset} ${c.red}PUSH Gagal: ${result.message}${c.reset}\n`);
            return false;
        }
    } catch (error) {
        console.log(`${c.red}${c.bright}❌ [NETWORK ERROR]${c.reset} ${c.red}Gagal menghubungi server pusat.${c.reset}\n`);
        return false;
    }
}

// --- FUNGSI UTAMA PUSH ---
export async function pushFile(filePath) {
    const config = getConfig();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login. Gunakan perintah: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    if (!filePath) {
        console.log(`${c.red}❌ Error: Masukkan argumen yang valid!${c.reset}\n${c.gray}(Contoh: ntc push draf.ntc ATAU ntc push all)${c.reset}`);
        process.exit(1);
    }

    // ==========================================
    // LOGIKA PUSH ALL (MASS UPLOAD)
    // ==========================================
    if (filePath.toLowerCase() === 'all') {
        console.log(`${c.cyan}🔍 Memindai direktori saat ini untuk mencari file .ntc...${c.reset}`);

        // Cari semua file berakhiran .ntc di direktori aktif
        const files = fs.readdirSync(process.cwd()).filter(file => file.endsWith('.ntc'));

        if (files.length === 0) {
            console.log(`${c.yellow}⚠️ Tidak ada file .ntc yang ditemukan di direktori ini.${c.reset}`);
            return;
        }

        console.log(`${c.cyan}🚀 Menemukan ${files.length} file. Memulai sinkronisasi massal ke server...${c.reset}\n`);

        let successCount = 0;
        for (const file of files) {
            const fullPath = path.resolve(process.cwd(), file);
            const fileName = path.basename(file, '.ntc');

            // Panggil helper yang udah kita bikin di atas
            const success = await processSingleFile(fullPath, fileName, config);
            if (success) successCount++;
        }

        console.log(`${c.green}${c.bright}✅ SINKRONISASI SELESAI! Berhasil memperbarui ${successCount}/${files.length} file.${c.reset}`);
    }
    // ==========================================
    // LOGIKA PUSH SINGLE FILE Bawaan Lu
    // ==========================================
    else {
        if (!filePath.endsWith('.ntc')) {
            console.log(`${c.red}❌ Error: Masukkan file .ntc yang valid!${c.reset}\n${c.gray}(Contoh: ntc push draf.ntc)${c.reset}`);
            process.exit(1);
        }

        const fullPath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) {
            console.log(`${c.red}❌ Error: File tidak ditemukan di rute: ${fullPath}${c.reset}`);
            process.exit(1);
        }

        const fileName = path.basename(filePath, '.ntc');
        await processSingleFile(fullPath, fileName, config);
    }
}