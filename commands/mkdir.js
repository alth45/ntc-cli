import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

export async function makeDirectory(folderName) {
    const config = getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login.${c.reset}`); process.exit(1);
    }
    if (!folderName) {
        console.log(`${c.red}❌ Error: Masukkan nama folder! (Contoh: ntc mkdir "Tutorial Python")${c.reset}`); process.exit(1);
    }

    console.log(`${c.cyan}⏳ Membuat direktori [${folderName}] di server...${c.reset}`);
    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-mkdir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.token}` },
            body: JSON.stringify({ folderName })
        });
        const result = await res.json();
        if (res.ok) console.log(`${c.green}${c.bright}📁 [SUCCESS]${c.reset} ${c.green}${result.message}${c.reset}`);
        else console.log(`${c.yellow}⚠️  [INFO]${c.reset} ${c.yellow}${result.message}${c.reset}`);
    } catch (e) {
        console.log(`${c.red}❌ Gagal menghubungi server.${c.reset}`);
    }
}