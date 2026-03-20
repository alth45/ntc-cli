import readline from 'readline';

export function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

export function askPassword(query) {
    return new Promise((resolve) => {
        // Cek kalau environment tidak support raw mode (misal: CI/pipe)
        if (!process.stdin.isTTY) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question(query, ans => {
                rl.close();
                resolve(ans);
            });
            return;
        }

        process.stdout.write(query);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        let password = '';

        const onData = (char) => {
            switch (char) {
                case '\r':
                case '\n':
                case '\u0003': // Ctrl+C
                    cleanup();
                    if (char === '\u0003') {
                        process.stdout.write('\n');
                        process.exit(0);
                    }
                    process.stdout.write('\n');
                    resolve(password);
                    break;

                case '\u007f': // Backspace
                case '\b':
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        // Hapus bintang terakhir di terminal
                        process.stdout.write('\b \b');
                    }
                    break;

                case '\u001b': // Escape — clear input
                    password = '';
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(query);
                    break;

                default:
                    // Hanya terima karakter printable (bukan control chars)
                    if (char >= ' ' && char <= '~') {
                        password += char;
                        process.stdout.write('*');
                    }
                    break;
            }
        };

        const cleanup = () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
        };

        process.stdin.on('data', onData);
    });
}