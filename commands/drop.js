import fs from 'fs';
import path from 'path';
import { c } from '../utils/theme.js';

export function dropFile(rawTarget) {
    // --- FIX SAKTI: Pertahanan Berlapis Anti-Crash ---
    // Kalau dari terminal gak sengaja ngelempar Array (misal: ['all']), 
    // kita paksa ambil isinya aja biar jadi String biasa ("all").
    const target = Array.isArray(rawTarget) ? rawTarget : rawTarget;

    if (!target || typeof target !== 'string') {
        console.log(`${c.red}❌ Error: Masukkan nama file atau gunakan 'all'!${c.reset}\n${c.gray}(Contoh: ntc drop catatan.ntc ATAU ntc drop all)${c.reset}`);
        process.exit(1);
    }

    // ==========================================
    // LOGIKA DROP ALL (SAPU BERSIH LOKAL)
    // ==========================================
    if (target.toLowerCase() === 'all') {
        console.log(`${c.cyan}🧹 Menyapu bersih semua file .ntc di direktori ini...${c.reset}`);

        // Cari semua file berakhiran .ntc
        const files = fs.readdirSync(process.cwd()).filter(file => file.endsWith('.ntc'));

        if (files.length === 0) {
            console.log(`${c.yellow}⚠️ Tidak ada file .ntc yang ditemukan untuk dihapus.${c.reset}`);
            return;
        }

        let count = 0;
        for (const file of files) {
            const fullPath = path.join(process.cwd(), file);
            fs.unlinkSync(fullPath); // Hancurkan file
            console.log(`${c.red} 🗑️  Dihapus:${c.reset} ${file}`);
            count++;
        }
        console.log(`\n${c.green}${c.bright}✅ AREA BERSIH! ${count} file lokal berhasil dimusnahkan.${c.reset}`);
    }
    // ==========================================
    // LOGIKA DROP SINGLE FILE
    // ==========================================
    else {
        // Pastikan formatnya .ntc walaupun user lupa ngetik
        const fileName = target.endsWith('.ntc') ? target : `${target}.ntc`;
        const fullPath = path.resolve(process.cwd(), fileName);

        if (!fs.existsSync(fullPath)) {
            console.log(`${c.red}❌ Error: File [${fileName}] tidak ditemukan di folder ini!${c.reset}`);
            process.exit(1);
        }

        fs.unlinkSync(fullPath);
        console.log(`${c.green}${c.bright}✅ [DROPPED]${c.reset} ${c.green}File lokal ${fileName} berhasil dihapus!${c.reset}`);
    }
}