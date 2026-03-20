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

const args = process.argv.slice(2);
const command = args[0];

// ROUTER COMMAND CLI
switch (command) {
    case 'login':
        loginTerminal();
        break;
    case 'push':
        pushFile(args[1]);
        break;
    case 'show':
    case 'ls':
        showFiles();
        break;
    case 'mkdir': // <--- BARU
        // Kalau nama foldernya pakai spasi, kita gabungin
        makeDirectory(args.slice(1).join(' '));
        break;
    case 'mv':    // <--- BARU
        // args[1] itu slug. Sisanya (args[2] dst) adalah nama folder
        moveFile(args[1], args.slice(2).join(' '));
        break;
    case 'drop': // <--- TAMBAHAN BARU
        // args isinya bisa nama file atau 'all'
        dropFile(args[1]);
        break;
    case 'delete':
    case 'pull':
        pullFiles(args[1]);
        break;
    case 'rm':
        deleteFile(args[1]);
        break;
    case 'publish': // <--- TAMBAHAN BARU
        publishFile(args[1]);
        break;
    case 'help':
    case undefined:
        console.log(`
${c.cyan}${c.bright}=========================================${c.reset}
${c.bright}      NTC (Note Clone) CLI - v1.3        ${c.reset}
${c.cyan}${c.bright}=========================================${c.reset}

${c.yellow}Cara penggunaan:${c.reset}
  ${c.green}ntc login${c.reset}            : Login interaktif ke NoteOS.
  ${c.green}ntc push <file.ntc>${c.reset}  : Upload file lokal ke database sebagai draf.
  ${c.green}ntc publish <slug>${c.reset}   : Publikasikan draf ke seluruh dunia.
  ${c.green}ntc show${c.reset}  (atau ls)  : Melihat daftar artikel yang sudah di-push.
  ${c.green}ntc mkdir <Nama Folder>${c.reset}        : Buat folder / playlist baru.
  ${c.green}ntc mv <slug> <Nama Folder>${c.reset}    : Pindah artikel ke folder (atau 'root').
  ${c.green}ntc pull${c.reset}                       : Tarik semua file dari server.
  ${c.green}ntc pull <slug>${c.reset}                : Tarik 1 file spesifik.
  ${c.green}ntc drop <file> / all${c.reset}        : Hapus file .ntc LOKAL di laptop lu.
  ${c.green}ntc pull rg <start>-<end>${c.reset}      : Tarik file berdasarkan range (ex: ntc pull rg 1-3).
  ${c.green}ntc delete <slug>${c.reset}    : Menghapus artikel dari database (bisa ntc rm).
  ${c.green}ntc help${c.reset}             : Menampilkan menu ini.
        `);
        break;
    default:
        console.log(`${c.red}❌ Perintah '${command}' tidak dikenali. Ketik '${c.yellow}ntc help${c.red}' untuk bantuan.${c.reset}`);
}