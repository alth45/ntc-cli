import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'loglevel';

export const CONFIG_PATH = path.join(os.homedir(), '.ntcrc');
export const SERVER_URL = 'https://note-clone-one.vercel.app';

// export function getConfig() {
//     if (fs.existsSync(CONFIG_PATH)) {
//         return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
//     }
//     return null;

// }

export function getConfig() {
    // 1. Cek keberadaan file dulu
    if (!fs.existsSync(CONFIG_PATH)) {
        log.warn(`Config file ga ketemu di: ${CONFIG_PATH}. Balikin null.`);
        return null;
    }

    try {
        // 2. Baca file secara sinkron
        const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');

        // 3. Cek kalau filenya kosong biar JSON.parse ga teriak
        if (!rawData.trim()) {
            log.warn("File config ada, tapi isinya kosong melompong.");
            return null;
        }

        // 4. Parsing JSON-nya
        return JSON.parse(rawData);

    } catch (error) {
        // Tangkep error kalau JSON rusak atau file ga bisa diakses (permission issue)
        log.error(`Amsyong! Gagal load config di ${CONFIG_PATH}`, error);

        // Tetap balikin null supaya app ga langsung mati
        return null;
    }
}

export function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}