import fs from 'fs';
import path from 'path';
import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

// ─── Diff engine ────────────────────────────────────────────────────────────

function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function countLines(text) {
    return text.split('\n').length;
}

/**
 * Diff dua string baris per baris.
 * Return array of { type: 'add'|'remove'|'same', line }
 * Pakai algoritma LCS sederhana — cukup untuk file teks/markdown.
 */
function diffLines(localText, serverText) {
    const localLines = localText.split('\n');
    const serverLines = serverText.split('\n');

    const m = localLines.length;
    const n = serverLines.length;

    // Batasi diff preview ke 300 baris supaya tidak lambat
    const MAX = 300;
    const lLines = localLines.slice(0, MAX);
    const sLines = serverLines.slice(0, MAX);

    // Build LCS table
    const dp = Array.from({ length: lLines.length + 1 }, () =>
        new Array(sLines.length + 1).fill(0)
    );
    for (let i = 1; i <= lLines.length; i++) {
        for (let j = 1; j <= sLines.length; j++) {
            dp[i][j] = lLines[i - 1] === sLines[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Trace back
    const result = [];
    let i = lLines.length, j = sLines.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lLines[i - 1] === sLines[j - 1]) {
            result.unshift({ type: 'same', line: lLines[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'remove', line: sLines[j - 1] }); // ada di server, hilang di lokal
            j--;
        } else {
            result.unshift({ type: 'add', line: lLines[i - 1] }); // ada di lokal, baru
            i--;
        }
    }

    return { diff: result, truncated: m > MAX || n > MAX, totalLocal: m, totalServer: n };
}

/**
 * Ambil konteks sekitar baris yang berubah (kayak git diff -U3)
 */
function buildHunks(diffResult, contextLines = 3) {
    const { diff } = diffResult;
    const changed = new Set();
    diff.forEach((entry, idx) => {
        if (entry.type !== 'same') {
            for (let k = Math.max(0, idx - contextLines); k <= Math.min(diff.length - 1, idx + contextLines); k++) {
                changed.add(k);
            }
        }
    });

    const hunks = [];
    let hunk = null;
    diff.forEach((entry, idx) => {
        if (changed.has(idx)) {
            if (!hunk) hunk = [];
            hunk.push({ ...entry, idx });
        } else {
            if (hunk) { hunks.push(hunk); hunk = null; }
        }
    });
    if (hunk) hunks.push(hunk);
    return hunks;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

function renderHunks(hunks, maxHunks = 3) {
    const shown = hunks.slice(0, maxHunks);
    shown.forEach((hunk, hi) => {
        console.log(`${c.gray}  @@ hunk ${hi + 1} @@${c.reset}`);
        hunk.forEach(({ type, line }) => {
            const trimmed = line.length > 90 ? line.slice(0, 90) + '…' : line;
            if (type === 'add') console.log(`  ${c.green}+ ${trimmed}${c.reset}`);
            else if (type === 'remove') console.log(`  ${c.red}- ${trimmed}${c.reset}`);
            else console.log(`  ${c.gray}  ${trimmed}${c.reset}`);
        });
    });
    if (hunks.length > maxHunks) {
        console.log(`  ${c.gray}... dan ${hunks.length - maxHunks} hunk lainnya. Push dulu buat lihat full diff.${c.reset}`);
    }
}

function renderFileSummary(slug, status, meta = {}) {
    const icons = {
        modified: `${c.yellow}~ MODIFIED${c.reset}`,
        new: `${c.green}+ NEW     ${c.reset}`,
        deleted: `${c.red}- DELETED ${c.reset}`,
        synced: `${c.gray}✓ SYNCED  ${c.reset}`,
    };
    const label = icons[status] ?? status;

    console.log(`\n  ${label}  ${c.bright}${slug}.ntc${c.reset}`);

    if (status === 'modified') {
        const { addedLines, removedLines, localWords, serverWords, localSize, serverSize } = meta;
        const wordDelta = localWords - serverWords;
        const wordSign = wordDelta >= 0 ? `+${wordDelta}` : `${wordDelta}`;
        console.log(`  ${c.gray}        Lines: ${c.green}+${addedLines}${c.reset}${c.gray} / ${c.red}-${removedLines}${c.reset}  ${c.gray}Words: ${wordSign}  Size: ${localSize}b → ${serverSize}b${c.reset}`);
    } else if (status === 'new') {
        const { localLines, localWords, localSize } = meta;
        console.log(`  ${c.gray}        ${localLines} lines · ${localWords} words · ${localSize}b — belum ada di server${c.reset}`);
    } else if (status === 'deleted') {
        console.log(`  ${c.gray}        Ada di server tapi tidak ditemukan di lokal${c.reset}`);
    }
}

// ─── Core logic ──────────────────────────────────────────────────────────────

async function fetchServerContent(config, slug) {
    const res = await fetch(`${SERVER_URL}/api/ntc-pull?mode=single&slug=${slug}`, {
        headers: { 'Authorization': `Bearer ${config.token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.posts || data.posts.length === 0) return null;
    const post = data.posts[0];
    const content = post.rawContent || post.content || '';
    return typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
}

async function fetchAllServerSlugs(config) {
    const res = await fetch(`${SERVER_URL}/api/ntc-list`, {
        headers: { 'Authorization': `Bearer ${config.token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.posts || []).map(p => p.slug);
}

async function checkSingleFile(config, filePath, slug, { verbose }) {
    const localContent = fs.readFileSync(filePath, 'utf-8');

    process.stdout.write(`  ${c.cyan}⏳ Fetching ${slug} dari server...${c.reset}\r`);
    const serverContent = await fetchServerContent(config, slug);

    if (serverContent === null) {
        renderFileSummary(slug, 'new', {
            localLines: countLines(localContent),
            localWords: countWords(localContent),
            localSize: Buffer.byteLength(localContent),
        });
        return 'new';
    }

    if (localContent.trim() === serverContent.trim()) {
        renderFileSummary(slug, 'synced');
        return 'synced';
    }

    const diffResult = diffLines(localContent, serverContent);
    const addedLines = diffResult.diff.filter(d => d.type === 'add').length;
    const removedLines = diffResult.diff.filter(d => d.type === 'remove').length;

    renderFileSummary(slug, 'modified', {
        addedLines,
        removedLines,
        localWords: countWords(localContent),
        serverWords: countWords(serverContent),
        localSize: Buffer.byteLength(localContent),
        serverSize: Buffer.byteLength(serverContent),
    });

    if (verbose) {
        const hunks = buildHunks(diffResult);
        if (hunks.length > 0) renderHunks(hunks);
        if (diffResult.truncated) {
            console.log(`  ${c.yellow}⚠️  File terlalu besar, diff dipotong di 300 baris pertama.${c.reset}`);
        }
    }

    return 'modified';
}

// ─── Public command ───────────────────────────────────────────────────────────

export async function statusFiles(slugArg, flags = {}) {
    const config = getConfigAsync();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Belum login. Gunakan: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    const verbose = flags.verbose || flags.v || false;

    console.log(`\n${c.cyan}${c.bright}=========================================${c.reset}`);
    console.log(`${c.cyan}${c.bright}       📋 NTC STATUS CHECK               ${c.reset}`);
    console.log(`${c.cyan}${c.bright}=========================================${c.reset}`);

    const counts = { new: 0, modified: 0, deleted: 0, synced: 0 };

    // ── Mode: satu file spesifik ──────────────────────────────────────────
    if (slugArg) {
        const fileName = slugArg.endsWith('.ntc') ? slugArg : `${slugArg}.ntc`;
        const fullPath = path.resolve(process.cwd(), fileName);
        const slug = path.basename(slugArg, '.ntc');

        if (!fs.existsSync(fullPath)) {
            // File tidak ada lokal — cek apakah ada di server
            const serverContent = await fetchServerContent(config, slug);
            if (serverContent) {
                renderFileSummary(slug, 'deleted');
            } else {
                console.log(`\n${c.red}❌ File [${fileName}] tidak ditemukan lokal maupun di server.${c.reset}`);
            }
            return;
        }

        await checkSingleFile(config, fullPath, slug, { verbose });
        console.log('');
        return;
    }

    // ── Mode: semua file .ntc di direktori ────────────────────────────────
    const localFiles = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.ntc'));

    if (localFiles.length === 0) {
        console.log(`\n${c.yellow}⚠️  Tidak ada file .ntc di direktori ini.${c.reset}\n`);
        return;
    }

    console.log(`\n${c.gray}  Memeriksa ${localFiles.length} file lokal...${c.reset}`);

    // Cek semua file lokal vs server
    for (const file of localFiles) {
        const slug = path.basename(file, '.ntc');
        const fullPath = path.resolve(process.cwd(), file);
        const result = await checkSingleFile(config, fullPath, slug, { verbose });
        counts[result]++;
    }

    // Cek file yang ada di server tapi tidak lokal
    console.log(`\n${c.gray}  Memeriksa file di server yang tidak ada lokal...${c.reset}`);
    const serverSlugs = await fetchAllServerSlugs(config);
    const localSlugs = new Set(localFiles.map(f => path.basename(f, '.ntc')));
    const deletedSlugs = serverSlugs.filter(s => !localSlugs.has(s));

    deletedSlugs.forEach(slug => {
        renderFileSummary(slug, 'deleted');
        counts.deleted++;
    });

    // ── Summary ───────────────────────────────────────────────────────────
    const total = localFiles.length + deletedSlugs.length;
    console.log(`\n${c.gray}─────────────────────────────────────────${c.reset}`);
    console.log(`  ${c.bright}Summary${c.reset}  (${total} file diperiksa)\n`);

    if (counts.modified > 0) console.log(`  ${c.yellow}~ ${counts.modified} modified${c.reset}`);
    if (counts.new > 0) console.log(`  ${c.green}+ ${counts.new} new (belum di server)${c.reset}`);
    if (counts.deleted > 0) console.log(`  ${c.red}- ${counts.deleted} deleted (tidak ada lokal)${c.reset}`);
    if (counts.synced > 0) console.log(`  ${c.gray}✓ ${counts.synced} synced${c.reset}`);

    if (counts.modified > 0 || counts.new > 0) {
        console.log(`\n  ${c.cyan}Tip: jalankan ${c.bright}ntc push all${c.reset}${c.cyan} untuk sync semua perubahan.${c.reset}`);
    } else if (counts.deleted > 0) {
        console.log(`\n  ${c.cyan}Tip: jalankan ${c.bright}ntc pull${c.reset}${c.cyan} untuk ambil file yang hilang dari server.${c.reset}`);
    } else {
        console.log(`\n  ${c.green}${c.bright}✅ Semua file sudah sync!${c.reset}`);
    }

    console.log('');
}