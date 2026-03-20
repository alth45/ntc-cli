import { c } from '../utils/theme.js';
import { SERVER_URL, saveConfig } from '../utils/config.js';
import { askQuestion } from '../utils/prompt.js';

export async function loginTerminal() {
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}`);
    console.log(`${c.cyan}${c.bright}       🔒 NOTEOS SECURE TERMINAL         ${c.reset}`);
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}\n`);

    const email = await askQuestion(`${c.gray}✉️  Email    : ${c.reset}`);
    const password = await askQuestion(`${c.gray}🔑 Password : ${c.reset}`);

    console.log(`\n${c.yellow}⏳ Mengautentikasi ke sistem pusat...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/cli-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            const config = { token: result.token, email: email, username: result.username };
            saveConfig(config); // Pakai fungsi dari utils/config.js
            console.log(`\n${c.green}${c.bright}✅ AKSES DIBERIKAN!${c.reset} ${c.green}Selamat datang kembali, ${result.username}.${c.reset}`);
            console.log(`${c.gray}Sistem siap menerima operasi push.${c.reset}`);
        } else {
            console.log(`\n${c.red}${c.bright}❌ [AKSES DITOLAK]${c.reset} ${c.red}${result.message}${c.reset}`);
        }
    } catch (error) {
        console.log(`\n${c.red}${c.bright}❌ [FATAL ERROR]${c.reset} ${c.red}Gagal menghubungi server NoteOS. Pastikan server berjalan.${c.reset}`);
    }
}