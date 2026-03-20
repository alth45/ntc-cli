import fs from 'fs';
import { c } from '../utils/theme.js';
import { CONFIG_PATH, getConfig, deleteConfig } from '../utils/config.js';
import { askQuestion } from '../utils/prompt.js';

export async function logout() {
    const config = getConfig(); // sync ok — hanya baca metadata lokal

    if (!config) {
        console.log(`\n  ${c.yellow}⚠️  Kamu memang belum login.${c.reset}\n`);
        return;
    }

    console.log(`\n  ${c.gray}Session aktif:${c.reset} ${c.bright}${config.username ?? config.email}${c.reset} ${c.gray}(${config.email})${c.reset}`);

    const confirm = await askQuestion(`  ${c.yellow}⚠️  Yakin mau logout? (y/n): ${c.reset}`);

    if (confirm.toLowerCase() !== 'y') {
        console.log(`  ${c.gray}Dibatalkan. Session tetap aktif.${c.reset}\n`);
        return;
    }

    // Hapus token dari keychain + hapus file metadata
    await deleteConfig();

    console.log(`\n  ${c.green}${c.bright}✅ Logout berhasil.${c.reset} ${c.gray}Sampai jumpa, ${config.username ?? config.email}!${c.reset}`);
    console.log(`  ${c.gray}Login lagi dengan: ${c.yellow}ntc login${c.reset}\n`);
}