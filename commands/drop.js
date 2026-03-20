import fs from 'fs';
import path from 'path';
import { c } from '../utils/theme.js';

export function dropFile(target) {
    // --- CCTV DETEKTIF KITA ---
    console.log("🕵️  Wujud asli target:", target);
    console.log("🕵️  Tipe datanya:", typeof target);
    console.log("--------------------------------");

    // Kalau wujudnya array ['all'], kita ambil teks dalamnya aja
    const finalTarget = Array.isArray(target) ? target : target;

    if (!finalTarget) {
        console.log(`${c.red}❌ Error: Masukkan nama file atau gunakan 'all'!${c.reset}`);
        process.exit(1);
    }

    if (finalTarget.toLowerCase() === 'all') {
        console.log(`${c.cyan}🧹 Menyapu bersih semua file .ntc di direktori ini...${c.reset}`);
        const files = fs.readdirSync(process.cwd()).filter(file => file.endsWith('.ntc'));

        if (files.length === 0) {
            console.log(`${c.yellow}⚠️ Tidak ada file .ntc yang ditemukan.${c.reset}`);
            return;
        }

        let count = 0;
        for (const file of files) {
            fs.unlinkSync(path.join(process.cwd(), file));
            console.log(`${c.red} 🗑️  Dihapus:${c.reset} ${file}`);
            count++;
        }
        console.log(`\n${c.green}${c.bright}✅ AREA BERSIH! ${count} file lokal berhasil dimusnahkan.${c.reset}`);
    } else {
        const fileName = finalTarget.endsWith('.ntc') ? finalTarget : `${finalTarget}.ntc`;
        const fullPath = path.resolve(process.cwd(), fileName);

        if (!fs.existsSync(fullPath)) {
            console.log(`${c.red}❌ Error: File [${fileName}] tidak ditemukan!${c.reset}`);
            process.exit(1);
        }

        fs.unlinkSync(fullPath);
        console.log(`${c.green}${c.bright}✅ File lokal ${fileName} berhasil dihapus!${c.reset}`);
    }
}