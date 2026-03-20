import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync, CONFIG_PATH } from '../utils/config.js';

export async function whoami() {
    const config = getConfigAsync();

    if (!config || !config.token) {
        console.log(`
${c.red}${c.bright}  ✗ Belum login${c.reset}
${c.gray}  Gunakan: ${c.yellow}ntc login${c.reset}
`);
        process.exit(1);
    }

    console.log(`\n${c.cyan}${c.bright}  ╔══════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}${c.bright}  ║         NOTEOS SESSION INFO          ║${c.reset}`);
    console.log(`${c.cyan}${c.bright}  ╚══════════════════════════════════════╝${c.reset}\n`);

    // Info dari config lokal dulu (offline-safe)
    console.log(`  ${c.gray}Username  :${c.reset} ${c.bright}${config.username ?? '—'}${c.reset}`);
    console.log(`  ${c.gray}Email     :${c.reset} ${config.email ?? '—'}`);
    console.log(`  ${c.gray}Config    :${c.reset} ${c.gray}${CONFIG_PATH}${c.reset}`);
    console.log(`  ${c.gray}Server    :${c.reset} ${c.cyan}${SERVER_URL}${c.reset}`);

    // Cek token masih valid ke server
    process.stdout.write(`\n  ${c.gray}Token     : Memverifikasi ke server...${c.reset}\r`);

    try {
        const res = await fetch(`${SERVER_URL}/api/ntc-list`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const total = data.posts?.length ?? '?';
            console.log(`  ${c.gray}Token     :${c.reset} ${c.green}${c.bright}✓ Valid${c.reset}                          `);
            console.log(`  ${c.gray}Catatan   :${c.reset} ${c.bright}${total}${c.reset} file di server`);
        } else if (res.status === 401) {
            console.log(`  ${c.gray}Token     :${c.reset} ${c.red}${c.bright}✗ Expired / tidak valid${c.reset}          `);
            console.log(`\n  ${c.yellow}Tip: login ulang dengan ${c.bright}ntc login${c.reset}`);
        } else {
            console.log(`  ${c.gray}Token     :${c.reset} ${c.yellow}? Tidak bisa diverifikasi (${res.status})${c.reset}`);
        }
    } catch {
        console.log(`  ${c.gray}Token     :${c.reset} ${c.yellow}? Server tidak terjangkau${c.reset}                `);
        console.log(`  ${c.gray}          (Token mungkin masih valid, tapi server offline)${c.reset}`);
    }

    console.log('');
}