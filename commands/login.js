import { c } from '../utils/theme.js';
import { SERVER_URL, saveConfig } from '../utils/config.js';
import { askQuestion, askPassword } from '../utils/prompt.js'; // ← tambah askPassword

export async function loginTerminal() {
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}`);
    console.log(`${c.cyan}${c.bright}       🔒 NOTEOS SECURE TERMINAL         ${c.reset}`);
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}\n`);

    const email = await askQuestion(`${c.gray}✉️  Email    : ${c.reset}`);
    const password = await askPassword(`${c.gray}🔑 Password : ${c.reset}`); // ← ganti ke askPassword

    console.log(`\n${c.yellow}⏳ Mengautentikasi ke sistem pusat...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/cli-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            await saveConfig({ token: result.token, email, username: result.username });
            console.log(`\n${c.green}${c.bright}✅ AKSES DIBERIKAN!${c.reset} ${c.green}Selamat datang, ${result.username}.${c.reset}`);
            console.log(`${c.gray}Token tersimpan di OS keychain.${c.reset}`);
        } else {
            console.log(`\n${c.red}${c.bright}❌ [AKSES DITOLAK]${c.reset} ${c.red}${result.message}${c.reset}`);
        }
    } catch (error) {
        console.log(`\n${c.red}${c.bright}❌ [FATAL ERROR]${c.reset} ${c.red}Gagal menghubungi server NoteOS. Pastikan server berjalan.${c.reset}`);
    }
}