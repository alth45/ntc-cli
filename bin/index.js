#!/usr/bin/env node

import { c } from '../utils/theme.js';
import { loginTerminal } from '../commands/login.js';
import { pushFile } from '../commands/push.js';
import { showFiles } from '../commands/show.js';
import { deleteFile } from '../commands/delete.js';
import { publishFile } from '../commands/publish.js';
import { makeDirectory } from '../commands/mkdir.js';
import { moveFile } from '../commands/mv.js';
import { pullFiles } from '../commands/pull.js';
import { dropFile } from '../commands/drop.js';
import { statusFiles } from '../commands/status.js';
import { whoami } from '../commands/whoami.js';
import { logout } from '../commands/logout.js';
import { searchFiles } from '../commands/search.js';
import { openArticle } from '../commands/open.js';
import { showStats } from '../commands/stats.js';

const args = process.argv.slice(2);
const command = args[0];

// Parse flags (--verbose / -v)
const flags = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    all: args.includes('--all') || args.includes('-a'),
    live: args.includes('--live') || args.includes('-l'),
    watch: args.includes('--watch') || args.includes('-w'),
};
// Argumen bersih tanpa flags
const cleanArgs = args.filter(a => !a.startsWith('-'));

switch (command) {
    case 'login':
        loginTerminal();
        break;
    case 'whoami':
    case 'me':
        whoami();
        break;
    case 'logout':
        logout();
        break;
    case 'search':
    case 'find':
        searchFiles(cleanArgs, flags);
        break;
    case 'open':
        openArticle(cleanArgs[1]);
        break;
    case 'stats':
        showStats();
        break;
    case 'push':
        pushFile(cleanArgs[1], flags);
        break;
    case 'show':
    case 'ls':
        showFiles();
        break;
    case 'status':
    case 'st':                                    // <--- BARU (shortcut)
        statusFiles(cleanArgs[1], flags);
        break;
    case 'mkdir':
        makeDirectory(cleanArgs.slice(1).join(' '));
        break;
    case 'mv':
        moveFile(cleanArgs[1], cleanArgs.slice(2).join(' '));
        break;
    case 'drop':
        dropFile(cleanArgs[1]);
        break;
    case 'pull':
        pullFiles(cleanArgs[1]);
        break;
    case 'rm':
        deleteFile(cleanArgs[1]);
        break;
    case 'publish':
        publishFile(cleanArgs[1]);
        break;
    case 'help':
    case undefined:
        console.log(`
${c.cyan}${c.bright}=========================================${c.reset}
${c.bright}      NTC (Note Clone) CLI - v1.4        ${c.reset}
${c.cyan}${c.bright}=========================================${c.reset}

${c.yellow}Cara penggunaan:${c.reset}
  ${c.green}ntc login${c.reset}            : Login interaktif ke NoteOS.
  ${c.green}ntc whoami${c.reset} (atau me) : Lihat info session yang sedang aktif.
  ${c.green}ntc logout${c.reset}           : Logout dan hapus session lokal.
  ${c.green}ntc search <keyword>${c.reset} : Cari catatan by keyword (title + konten).
  ${c.green}ntc search <kw> --live${c.reset}  : Filter hanya yang sudah dipublish.
  ${c.green}ntc search <kw> --all${c.reset}   : Tampilkan semua hasil tanpa batas.
  ${c.green}ntc open <slug>${c.reset}      : Buka artikel di browser (draf → editor, live → publik).
  ${c.green}ntc stats${c.reset}            : Tampilkan statistik lengkap semua catatan.
  ${c.green}ntc push <file.ntc>${c.reset}  : Upload file lokal ke database sebagai draf.
  ${c.green}ntc push <file.ntc> --watch${c.reset} : Live sync — auto push setiap kali file disimpan.
  ${c.green}ntc publish <slug>${c.reset}   : Publikasikan draf ke seluruh dunia.
  ${c.green}ntc show${c.reset}  (atau ls)  : Melihat daftar artikel yang sudah di-push.
  ${c.green}ntc status${c.reset} (atau st) : Cek diff lokal vs server sebelum push.
  ${c.green}ntc status <slug>${c.reset}    : Cek diff untuk 1 file spesifik.
  ${c.green}ntc status --verbose${c.reset} : Tampilkan diff per baris (kayak git diff).
  ${c.green}ntc mkdir <Nama Folder>${c.reset}        : Buat folder / playlist baru.
  ${c.green}ntc mv <slug> <Nama Folder>${c.reset}    : Pindah artikel ke folder (atau 'root').
  ${c.green}ntc pull${c.reset}                       : Tarik semua file dari server.
  ${c.green}ntc pull <slug>${c.reset}                : Tarik 1 file spesifik.
  ${c.green}ntc drop <file> / all${c.reset}          : Hapus file .ntc LOKAL di laptop lu.
  ${c.green}ntc pull rg <start>-<end>${c.reset}      : Tarik file berdasarkan range (ex: ntc pull rg 1-3).
  ${c.green}ntc rm <slug>${c.reset}                  : Menghapus artikel dari database.
  ${c.green}ntc help${c.reset}             : Menampilkan menu ini.
        `);
        break;
    default:
        console.log(`${c.red}❌ Perintah '${command}' tidak dikenali. Ketik '${c.yellow}ntc help${c.red}' untuk bantuan.${c.reset}`);
}