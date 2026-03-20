import { execSync } from 'child_process';
import { c } from '../utils/theme.js';
import { SERVER_URL, getConfig } from '../utils/config.js';

// ─── Deteksi OS dan buka URL di browser default ───────────────────────────────
function openBrowser(url) {
    const cmds = {
        win32: `start "" "${url}"`,
        darwin: `open "${url}"`,
        linux: `xdg-open "${url}"`,
    };
    const cmd = cmds[process.platform] ?? cmds.linux;
    execSync(cmd, { stdio: 'ignore' });
}

// ─── Public command ───────────────────────────────────────────────────────────
export async function openArticle(slug) {
    const config = getConfig();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Belum login. Gunakan: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    if (!slug) {
        console.log(`\n${c.red}❌ Masukkan slug artikel!${c.reset}`);
        console.log(`${c.gray}   Contoh: ntc open git-bisect${c.reset}\n`);
        process.exit(1);
    }

    // Cek dulu apakah artikel ada & statusnya di server
    process.stdout.write(`  ${c.cyan}⏳ Mengecek artikel di server...${c.reset}\r`);

    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-pull?mode=single&slug=${slug}`, {
            headers: { 'Authorization': `Bearer ${config.token}` }
        });
        const data = await res.json();
        const post = data.posts?.[0];

        if (!res.ok || !post) {
            console.log(`  ${c.red}❌ Artikel "${slug}" tidak ditemukan di server.${c.reset}          \n`);
            process.exit(1);
        }

        const isDraft = !post.published;
        const readUrl = `${SERVER_URL}/post/${slug}`;
        const editUrl = `${SERVER_URL}/write/${post.id}`;
        const targetUrl = isDraft ? editUrl : readUrl;
        const targetLabel = isDraft ? 'editor (masih draf)' : 'halaman publik';

        console.log(`  ${c.green}${c.bright}🌐 Membuka ${targetLabel}:${c.reset}          `);
        console.log(`  ${c.cyan}${targetUrl}${c.reset}\n`);

        openBrowser(targetUrl);

        if (isDraft) {
            console.log(`  ${c.yellow}Tip: jalankan ${c.bright}ntc publish ${slug}${c.reset}${c.yellow} untuk publikasikan artikel ini.${c.reset}\n`);
        }

    } catch (err) {
        console.log(`  ${c.red}❌ Gagal: ${err.message}${c.reset}\n`);
        process.exit(1);
    }
}