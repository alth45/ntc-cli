import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function countLines(text) {
    if (!text) return 0;
    return text.split('\n').length;
}

function formatNumber(n) {
    return n.toLocaleString('id-ID');
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

// ─── Bar chart ASCII ──────────────────────────────────────────────────────────

function miniBar(value, max, width = 20) {
    const filled = max === 0 ? 0 : Math.round((value / max) * width);
    const empty = width - filled;
    return `${c.cyan}${'█'.repeat(filled)}${c.reset}${c.gray}${'░'.repeat(empty)}${c.reset}`;
}

// ─── Hitung streak nulis (hari berturut-turut ada activity) ──────────────────

function calcStreak(posts) {
    if (posts.length === 0) return 0;

    // Kumpulkan semua tanggal unik ada activity (push/update)
    const daySet = new Set(
        posts.map(p => new Date(p.updatedAt).toISOString().slice(0, 10))
    );
    const days = [...daySet].sort().reverse(); // newest first

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const day of days) {
        const d = new Date(day);
        const diff = Math.round((cursor - d) / 86400000);
        if (diff <= 1) {
            streak++;
            cursor = d;
        } else {
            break;
        }
    }
    return streak;
}

// ─── Activity heatmap 7 hari terakhir ─────────────────────────────────────────

function buildWeekActivity(posts) {
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    });

    const countByDay = {};
    posts.forEach(p => {
        const day = new Date(p.updatedAt).toISOString().slice(0, 10);
        countByDay[day] = (countByDay[day] ?? 0) + 1;
    });

    return days.map(day => ({
        day,
        label: new Date(day).toLocaleDateString('id-ID', { weekday: 'short' }),
        count: countByDay[day] ?? 0,
    }));
}

function renderHeatmap(weekData) {
    const max = Math.max(...weekData.map(d => d.count), 1);
    const blocks = ['░', '▒', '▓', '█'];

    const bar = weekData.map(({ count }) => {
        if (count === 0) return `${c.gray}░${c.reset}`;
        const idx = Math.min(blocks.length - 1, Math.ceil((count / max) * blocks.length) - 1);
        return `${c.cyan}${blocks[idx]}${c.reset}`;
    }).join(' ');

    const labels = weekData.map(({ label }) => label.slice(0, 3).padEnd(3)).join(' ');

    return { bar, labels };
}

// ─── Folder breakdown ─────────────────────────────────────────────────────────

function buildFolderBreakdown(posts) {
    const map = {};
    posts.forEach(p => {
        const name = p.folder?.name ?? '(root)';
        if (!map[name]) map[name] = { total: 0, live: 0, words: 0 };
        map[name].total++;
        if (p.published) map[name].live++;
        map[name].words += countWords(p.rawContent ?? p.content ?? '');
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
}

// ─── Public command ───────────────────────────────────────────────────────────

export async function showStats() {
    const config = getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Belum login. Gunakan: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    process.stdout.write(`\n  ${c.cyan}⏳ Mengambil data dari server...${c.reset}\r`);

    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-pull?mode=all`, {
            headers: { 'Authorization': `Bearer ${config.token}` }
        });
        const data = await res.json();

        if (!res.ok) {
            console.log(`  ${c.red}❌ Gagal: ${data.message ?? res.status}${c.reset}\n`);
            process.exit(1);
        }

        const posts = data.posts ?? [];

        // ── Hitung semua metrik ──────────────────────────────────────────
        const totalCatatan = posts.length;
        const totalLive = posts.filter(p => p.published).length;
        const totalDraf = totalCatatan - totalLive;
        const totalWords = posts.reduce((s, p) => s + countWords(p.rawContent ?? p.content ?? ''), 0);
        const totalLines = posts.reduce((s, p) => s + countLines(p.rawContent ?? p.content ?? ''), 0);
        const totalSize = posts.reduce((s, p) => s + Buffer.byteLength(p.rawContent ?? p.content ?? '', 'utf-8'), 0);
        const avgWords = totalCatatan === 0 ? 0 : Math.round(totalWords / totalCatatan);
        const streak = calcStreak(posts);
        const weekData = buildWeekActivity(posts);
        const folderBreak = buildFolderBreakdown(posts);

        const sorted = [...posts].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const lastUpdated = sorted[0];
        const longestPost = [...posts].sort((a, b) =>
            countWords(b.rawContent ?? b.content ?? '') - countWords(a.rawContent ?? a.content ?? '')
        )[0];

        const { bar: heatBar, labels: heatLabels } = renderHeatmap(weekData);

        // ── Render ───────────────────────────────────────────────────────
        console.log(`\n${c.cyan}${c.bright}  ╔══════════════════════════════════════╗${c.reset}`);
        console.log(`${c.cyan}${c.bright}  ║         NTC STATS — ${(config.username ?? 'user').padEnd(14)}   ║${c.reset}`);
        console.log(`${c.cyan}${c.bright}  ╚══════════════════════════════════════╝${c.reset}\n`);

        // ── Summary cards ─────────────────────────────────────────────
        const row = (label, value, extra = '') =>
            `  ${c.gray}${label.padEnd(16)}${c.reset}${c.bright}${String(value).padStart(8)}${c.reset}  ${c.gray}${extra}${c.reset}`;

        console.log(row('Total catatan', formatNumber(totalCatatan)));
        console.log(row('Live / Draf', `${totalLive} / ${totalDraf}`));
        console.log(row('Total kata', formatNumber(totalWords), `~${formatNumber(avgWords)} kata/catatan`));
        console.log(row('Total baris', formatNumber(totalLines)));
        console.log(row('Total ukuran', formatSize(totalSize)));
        console.log(row('Streak nulis', `${streak} hari`, streak >= 3 ? '🔥' : ''));

        // ── Activity heatmap 7 hari ────────────────────────────────────
        console.log(`\n  ${c.gray}Aktivitas 7 hari terakhir:${c.reset}`);
        console.log(`  ${heatBar}`);
        console.log(`  ${c.gray}${heatLabels}${c.reset}`);

        // ── Bar chart: top folder ──────────────────────────────────────
        if (folderBreak.length > 0) {
            console.log(`\n  ${c.gray}Sebaran per folder:${c.reset}`);
            const maxCount = folderBreak[0][1].total;
            folderBreak.slice(0, 6).forEach(([name, { total, live, words }]) => {
                const bar = miniBar(total, maxCount, 16);
                const label = name.length > 14 ? name.slice(0, 13) + '…' : name.padEnd(14);
                console.log(
                    `  ${c.gray}${label}${c.reset}  ${bar}  ` +
                    `${c.bright}${String(total).padStart(2)}${c.reset} ${c.gray}(${live} live · ${formatNumber(words)} kata)${c.reset}`
                );
            });
            if (folderBreak.length > 6) {
                console.log(`  ${c.gray}...dan ${folderBreak.length - 6} folder lainnya${c.reset}`);
            }
        }

        // ── Highlights ────────────────────────────────────────────────
        console.log(`\n  ${c.gray}──────────────────────────────────────${c.reset}`);

        if (lastUpdated) {
            console.log(
                `  ${c.gray}Terakhir diupdate :${c.reset} ${c.bright}${lastUpdated.title}${c.reset}` +
                `  ${c.gray}${timeAgo(lastUpdated.updatedAt)}${c.reset}`
            );
        }
        if (longestPost) {
            const wc = countWords(longestPost.rawContent ?? longestPost.content ?? '');
            console.log(
                `  ${c.gray}Catatan terpanjang:${c.reset} ${c.bright}${longestPost.title}${c.reset}` +
                `  ${c.gray}${formatNumber(wc)} kata${c.reset}`
            );
        }
        if (totalCatatan === 0) {
            console.log(`\n  ${c.yellow}Belum ada catatan. Mulai dengan: ${c.bright}ntc push <file.ntc>${c.reset}`);
        }

        console.log('');

    } catch (err) {
        console.log(`  ${c.red}❌ Network error: ${err.message}${c.reset}\n`);
        process.exit(1);
    }
}