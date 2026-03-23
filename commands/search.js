import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

// ─── Highlight keyword dalam teks ────────────────────────────────────────────
function highlight(text, keyword) {
    if (!keyword) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(escaped, 'gi'), (match) =>
        `${c.bright}${c.yellow}${match}${c.reset}`
    );
}

function getSnippet(content, keyword, snippetLength = 120) {
    if (!content) return null;
    const lower = content.toLowerCase();
    const kwLower = keyword.toLowerCase();
    const idx = lower.indexOf(kwLower);
    if (idx === -1) return null;

    const start = Math.max(0, idx - 40);
    const end = Math.min(content.length, idx + snippetLength);
    const raw = content.slice(start, end).replace(/\n+/g, ' ').trim();
    const snippet = (start > 0 ? '...' : '') + raw + (end < content.length ? '...' : '');

    return highlight(snippet, keyword);
}

function countOccurrences(text, keyword) {
    if (!text || !keyword) return 0;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (text.match(new RegExp(escaped, 'gi')) ?? []).length;
}

function renderResult(post, keyword, index) {
    const status = post.published ? `${c.green}LIVE${c.reset}` : `${c.yellow}DRAF${c.reset}`;
    const folder = post.folder ? ` ${c.gray}📁 ${post.folder.name}${c.reset}` : '';
    const updatedAt = new Date(post.updatedAt).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const hits = countOccurrences(post.rawContent ?? post.content ?? '', keyword);

    console.log(
        `  ${c.gray}${String(index).padStart(2)}.${c.reset} ` +
        `${c.bright}${highlight(post.title, keyword)}${c.reset}` +
        `  [${status}]${folder}`
    );

    console.log(
        `      ${c.gray}slug: ${post.slug}` +
        `  ·  ${hits} kemunculan` +
        `  ·  ${updatedAt}${c.reset}`
    );

    const snippet = getSnippet(post.rawContent ?? post.content ?? '', keyword);
    if (snippet) {
        console.log(`      ${c.gray}"${c.reset}${snippet}${c.gray}"${c.reset}`);
    }

    console.log('');
}

// ─── Public command ───────────────────────────────────────────────────────────
export async function searchFiles(args, flags = {}) {
    // ✅ FIX: tambah await
    const config = await getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Belum login. Gunakan: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    const keyword = args.slice(1).join(' ').trim();

    if (!keyword) {
        console.log(`\n${c.red}❌ Masukkan keyword!${c.reset}`);
        console.log(`${c.gray}   Contoh: ntc search git bisect${c.reset}`);
        console.log(`${c.gray}   Contoh: ntc search "machine learning"\n${c.reset}`);
        process.exit(1);
    }

    const searchAll = flags.all || flags.a || false;
    const searchLive = flags.live || flags.l || false;

    console.log(`\n${c.cyan}  🔍 Mencari "${c.bright}${keyword}${c.reset}${c.cyan}"...${c.reset}\n`);

    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-pull?mode=all`, {
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.log(`${c.red}❌ Gagal fetch dari server: ${err.message ?? res.status}${c.reset}\n`);
            process.exit(1);
        }

        const data = await res.json();
        const posts = data.posts ?? [];

        if (posts.length === 0) {
            console.log(`  ${c.yellow}Belum ada catatan di server.${c.reset}\n`);
            return;
        }

        let pool = posts;
        if (searchLive) pool = posts.filter(p => p.published);
        else if (!searchAll) pool = posts;

        const kwLower = keyword.toLowerCase();
        const results = pool.filter(post => {
            const titleMatch = post.title?.toLowerCase().includes(kwLower);
            const contentMatch = (post.rawContent ?? post.content ?? '')
                .toLowerCase().includes(kwLower);
            return titleMatch || contentMatch;
        });

        results.sort((a, b) => {
            const aTitle = a.title?.toLowerCase().includes(kwLower) ? 1 : 0;
            const bTitle = b.title?.toLowerCase().includes(kwLower) ? 1 : 0;
            if (bTitle !== aTitle) return bTitle - aTitle;

            const aHits = countOccurrences(a.rawContent ?? a.content ?? '', keyword);
            const bHits = countOccurrences(b.rawContent ?? b.content ?? '', keyword);
            return bHits - aHits;
        });

        if (results.length === 0) {
            console.log(`  ${c.yellow}Tidak ada hasil untuk "${keyword}".${c.reset}`);
            console.log(`  ${c.gray}Tips: coba keyword yang lebih pendek, atau ntc search ${kwLower.split(' ')[0]}${c.reset}\n`);
            return;
        }

        const maxShow = flags.all ? results.length : Math.min(results.length, 10);
        console.log(`  ${c.gray}Ditemukan ${c.bright}${results.length}${c.reset}${c.gray} hasil dari ${pool.length} catatan:${c.reset}\n`);

        results.slice(0, maxShow).forEach((post, i) => renderResult(post, keyword, i + 1));

        if (results.length > maxShow) {
            console.log(`  ${c.gray}... ${results.length - maxShow} hasil lainnya. Gunakan ${c.yellow}ntc search ${keyword} --all${c.reset}${c.gray} untuk tampilkan semua.${c.reset}\n`);
        }

        if (results.length > 0) {
            console.log(`  ${c.gray}──────────────────────────────────────────${c.reset}`);
            console.log(`  ${c.gray}Tip: ${c.yellow}ntc pull ${results[0].slug}${c.gray} untuk pull hasil teratas${c.reset}`);
            console.log(`  ${c.gray}     ${c.yellow}ntc search ${keyword} --live${c.gray} untuk filter yang sudah live saja${c.reset}\n`);
        }

    } catch (err) {
        console.log(`${c.red}❌ Network error: ${err.message}${c.reset}\n`);
        process.exit(1);
    }
}