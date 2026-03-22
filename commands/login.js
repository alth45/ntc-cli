import { c } from '../utils/theme.js';
import { SERVER_URL, saveConfig } from '../utils/config.js';
import { askQuestion, askPassword } from '../utils/prompt.js';

export async function loginTerminal() {
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}`);
    console.log(`${c.cyan}${c.bright}       🔒 NOTEOS SECURE TERMINAL         ${c.reset}`);
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}\n`);

    const email = await askQuestion(`${c.gray}✉️  Email    : ${c.reset}`);
    const password = await askPassword(`${c.gray}🔑 Password : ${c.reset}`);

    console.log(`\n${c.yellow}⏳ Mengautentikasi ke sistem pusat...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/cli-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
            // Simpan token + expiresAt ke keychain/config
            await saveConfig({
                token: result.token,
                expiresAt: result.expiresAt,
                email,
                username: result.username,
            });

            // Hitung berapa hari lagi expired untuk ditampilkan
            const daysLeft = Math.floor(
                (new Date(result.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            const expiryDate = new Date(result.expiresAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
            });

            console.log(`\n${c.green}${c.bright}✅ AKSES DIBERIKAN!${c.reset} ${c.green}Selamat datang, ${result.username}.${c.reset}`);
            console.log(`${c.gray}Token berlaku ${daysLeft} hari (sampai ${expiryDate}).${c.reset}`);
            console.log(`${c.gray}Token akan diperbarui otomatis 3 hari sebelum kedaluwarsa.${c.reset}`);

        } else {
            // Cek apakah token expired (bisa terjadi kalau user punya sesi lama)
            if (result.expired) {
                console.log(`\n${c.yellow}${c.bright}⚠️  TOKEN KEDALUWARSA${c.reset} ${c.yellow}Silakan login ulang.${c.reset}`);
            } else {
                console.log(`\n${c.red}${c.bright}❌ [AKSES DITOLAK]${c.reset} ${c.red}${result.message}${c.reset}`);
            }
        }

    } catch {
        console.log(`\n${c.red}${c.bright}❌ [FATAL ERROR]${c.reset} ${c.red}Gagal menghubungi server NoteOS.${c.reset}`);
    }
}