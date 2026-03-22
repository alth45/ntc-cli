import { c } from '../utils/theme.js';
import { SERVER_URL, getConfigAsync } from '../utils/config.js';

export async function whoami() {
    const config = await getConfigAsync();

    if (!config?.token) {
        console.log(`${c.red}✗ Belum login. Jalankan: ${c.bright}ntc login${c.reset}`);
        return;
    }

    // Hitung sisa hari token
    let expiryLine = '';
    if (config.expiresAt) {
        const msLeft = new Date(config.expiresAt).getTime() - Date.now();
        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        const dateStr = new Date(config.expiresAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
        });

        if (daysLeft < 0) {
            expiryLine = `${c.red}  Token    : KEDALUWARSA — jalankan ntc login${c.reset}`;
        } else if (daysLeft <= 3) {
            expiryLine = `${c.yellow}  Token    : ${daysLeft} hari lagi (${dateStr}) — akan diperbarui otomatis${c.reset}`;
        } else {
            expiryLine = `${c.gray}  Token    : ${daysLeft} hari lagi (sampai ${dateStr})${c.reset}`;
        }
    }

    console.log(`\n${c.cyan}${c.bright}╔══ SESSION AKTIF ══════════════════════╗${c.reset}`);

    try {
        // Verifikasi ke server
        const res = await fetch(`${SERVER_URL}/api/whoami`, {
            headers: { Authorization: `Bearer ${config.token}` },
        });
        const data = await res.json();

        if (res.ok) {
            console.log(`${c.cyan}${c.bright}║${c.reset} ${c.green}✓ Terverifikasi${c.reset}`);
            console.log(`${c.cyan}${c.bright}╚═══════════════════════════════════════╝${c.reset}\n`);
            console.log(`${c.bright}  User     :${c.reset} ${data.username || config.username || '—'}`);
            console.log(`${c.bright}  Email    :${c.reset} ${config.email || '—'}`);
            if (expiryLine) console.log(expiryLine);
        } else if (data.expired) {
            console.log(`${c.cyan}${c.bright}║${c.reset} ${c.red}✗ Token kedaluwarsa${c.reset}`);
            console.log(`${c.cyan}${c.bright}╚═══════════════════════════════════════╝${c.reset}\n`);
            console.log(`${c.yellow}Jalankan ${c.bright}ntc login${c.reset}${c.yellow} untuk memperbarui sesi.${c.reset}`);
        } else {
            console.log(`${c.cyan}${c.bright}║${c.reset} ${c.yellow}⚠ Server tidak merespons dengan benar${c.reset}`);
            console.log(`${c.cyan}${c.bright}╚═══════════════════════════════════════╝${c.reset}\n`);
            console.log(`${c.bright}  User     :${c.reset} ${config.username || '—'} ${c.gray}(lokal)${c.reset}`);
            console.log(`${c.bright}  Email    :${c.reset} ${config.email || '—'}`);
            if (expiryLine) console.log(expiryLine);
        }

    } catch {
        // Server tidak bisa dicapai — tampilkan info lokal saja
        console.log(`${c.cyan}${c.bright}║${c.reset} ${c.yellow}⚠ Offline — menampilkan data lokal${c.reset}`);
        console.log(`${c.cyan}${c.bright}╚═══════════════════════════════════════╝${c.reset}\n`);
        console.log(`${c.bright}  User     :${c.reset} ${config.username || '—'}`);
        console.log(`${c.bright}  Email    :${c.reset} ${config.email || '—'}`);
        if (expiryLine) console.log(expiryLine);
    }

    console.log('');
}