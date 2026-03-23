import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';
import { askQuestion } from '../utils/prompt.js';

export async function publishFile(slug) {
    // ✅ FIX: tambah await
    const config = await getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login. Gunakan perintah: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    if (!slug) {
        console.log(`${c.red}❌ Error: Masukkan slug artikel yang ingin dipublikasi!${c.reset}`);
        console.log(`${c.gray}(Contoh: ntc publish catatan-hacker)${c.reset}`);
        process.exit(1);
    }

    const confirm = await askQuestion(`${c.yellow}🌐 YAKIN ingin mempublikasikan [${c.bright}${slug}${c.reset}${c.yellow}] ke seluruh dunia? (y/n): ${c.reset}`);

    if (confirm.toLowerCase() !== 'y') {
        console.log(`${c.gray}Operasi dibatalkan. Artikel tetap menjadi draf yang aman.${c.reset}`);
        return;
    }

    console.log(`${c.cyan}⏳ Mengirim sinyal peluncuran ke server...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/ntc-publish?slug=${slug}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`\n${c.green}${c.bright}🚀 [LIVE]${c.reset} ${c.green}Artikel '${slug}' resmi MENGUDARA!${c.reset}`);
            console.log(`${c.cyan}🔗 Link Publik: ${c.gray}${SERVER_URL}/post/${result.slug}${c.reset}`);
        } else {
            console.log(`\n${c.yellow}⚠️  [INFO]${c.reset} ${c.yellow}${result.message}${c.reset}`);
        }
    } catch (error) {
        console.log(`${c.red}${c.bright}❌ [NETWORK ERROR]${c.reset} ${c.red}Gagal menghubungi server pusat.${c.reset}`);
    }
}