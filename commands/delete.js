import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';
import { askQuestion } from '../utils/prompt.js'; // Kita pakai buat konfirmasi (y/n)

export async function deleteFile(slug) {
    const config = getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login. Gunakan perintah: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    if (!slug) {
        console.log(`${c.red}❌ Error: Masukkan slug artikel yang ingin dihapus!${c.reset}`);
        console.log(`${c.gray}(Contoh: ntc delete nama-file-tanpa-extensi)${c.reset}`);
        process.exit(1);
    }

    // 1. Minta konfirmasi sebelum mengeksekusi (Safety First!)
    const confirm = await askQuestion(`${c.yellow}⚠️  YAKIN ingin menghapus artikel [${c.bright}${slug}${c.reset}${c.yellow}] secara permanen? (y/n): ${c.reset}`);

    if (confirm.toLowerCase() !== 'y') {
        console.log(`${c.gray}Operasi dibatalkan. File Anda aman.${c.reset}`);
        return; // Berhenti di sini
    }

    console.log(`${c.cyan}⏳ Menghancurkan artikel dari database...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/ntc-delete?slug=${slug}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`\n${c.green}${c.bright}🗑️  [DELETED]${c.reset} ${c.green}Artikel '${slug}' berhasil dimusnahkan!${c.reset}`);
        } else {
            console.log(`\n${c.red}${c.bright}❌ [GAGAL]${c.reset} ${c.red}${result.message}${c.reset}`);
        }
    } catch (error) {
        console.log(`${c.red}${c.bright}❌ [NETWORK ERROR]${c.reset} ${c.red}Gagal menghubungi server pusat.${c.reset}`);
    }
}