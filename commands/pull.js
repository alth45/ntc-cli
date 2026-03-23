import fs from 'fs';
import path from 'path';
import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

export async function pullFiles(args) {
    // ✅ FIX: tambah await
    const config = await getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login.${c.reset}`); process.exit(1);
    }

    let url = `${SERVER_URL}/api/ntc-pull?mode=all`;
    let pullInfo = "Menarik SEMUA catatan...";

    if (args[0] === 'rg' && args[1]) {
        const range = args[1].split('-');
        if (range.length !== 2) {
            console.log(`${c.red}❌ Format range salah. Gunakan: ntc pull rg 1-3${c.reset}`); process.exit(1);
        }
        const start = parseInt(range[0]) - 1;
        const take = parseInt(range[1]) - start;

        url = `${SERVER_URL}/api/ntc-pull?mode=range&skip=${start}&take=${take}`;
        pullInfo = `Menarik catatan urutan ke-${range[0]} sampai ${range[1]}...`;

    } else if (args[0] && args[0] !== 'rg') {
        url = `${SERVER_URL}/api/ntc-pull?mode=single&slug=${args[0]}`;
        pullInfo = `Menarik catatan: [${args[0]}]...`;
    }

    console.log(`${c.cyan}⏳ ${pullInfo}${c.reset}`);

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        const result = await res.json();

        if (res.ok && result.posts) {
            let count = 0;
            for (const post of result.posts) {
                const filename = `${post.slug}.ntc`;
                let contentToWrite = post.rawContent || post.content || "";

                if (typeof contentToWrite === 'object') {
                    contentToWrite = JSON.stringify(contentToWrite, null, 2);
                }

                fs.writeFileSync(path.join(process.cwd(), filename), contentToWrite, 'utf8');
                console.log(`${c.green} 📥 Diunduh:${c.reset} ${filename}`);
                count++;
            }
            console.log(`\n${c.green}${c.bright}✅ Selesai! ${count} file berhasil di-pull ke direktori saat ini.${c.reset}`);
        } else {
            console.log(`${c.yellow}⚠️  [INFO]${c.reset} ${c.yellow}${result.message}${c.reset}`);
        }
    } catch (error) {
        console.log(`${c.red}❌ Gagal menghubungi server atau menulis file.${c.reset}`);
    }
}