import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

export async function moveFile(slug, folderName) {
    // ✅ FIX: tambah await
    const config = await getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login.${c.reset}`); process.exit(1);
    }
    if (!slug || !folderName) {
        console.log(`${c.red}❌ Error: Format salah!${c.reset}`);
        console.log(`${c.gray}Format: ntc mv <slug-artikel> <"Nama Folder" | root>${c.reset}`);
        process.exit(1);
    }

    console.log(`${c.cyan}⏳ Memindahkan [${slug}] ke -> [${folderName}]...${c.reset}`);
    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-mv?slug=${slug}&folder=${encodeURIComponent(folderName)}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${config.token}` }
        });
        const result = await res.json();
        if (res.ok) console.log(`${c.green}${c.bright}🚚 [MOVED]${c.reset} ${c.green}${result.message}${c.reset}`);
        else console.log(`${c.yellow}⚠️  [INFO]${c.reset} ${c.yellow}${result.message}${c.reset}`);
    } catch (e) {
        console.log(`${c.red}❌ Gagal menghubungi server.${c.reset}`);
    }
}