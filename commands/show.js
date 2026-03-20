import { c } from '../utils/theme.js';
import { SERVER_URL, getConfig } from '../utils/config.js';

export async function showFiles() {
    const config = getConfig();
    if (!config || !config.token) {
        console.log(`${c.red}❌ Error: Anda belum login. Gunakan perintah: ${c.yellow}ntc login${c.reset}`);
        process.exit(1);
    }

    console.log(`${c.cyan}⏳ Mengambil data dari brankas NoteOS...${c.reset}`);

    try {
        const response = await fetch(`${SERVER_URL}/api/ntc-list`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        const result = await response.json();

        if (response.ok) {
            if (result.posts.length === 0) {
                console.log(`\n${c.yellow}📂 Belum ada artikel yang di-push. Mulai menulis dengan ${c.green}ntc push <file.ntc>${c.reset}`);
                return;
            }

            console.log(`\n${c.bright}${c.magenta}🗄️  BRANKAS NOTEOS (Total: ${result.posts.length} File)${c.reset}`);
            console.log(`${c.gray}================================================${c.reset}`);

            const groupedPosts = {};
            result.posts.forEach(post => {
                const folderName = post.folder ? post.folder.name : 'Root (Di Luar Folder)';
                if (!groupedPosts[folderName]) groupedPosts[folderName] = [];
                groupedPosts[folderName].push(post);
            });

            for (const [folderName, posts] of Object.entries(groupedPosts)) {
                const folderColor = folderName === 'Root (Di Luar Folder)' ? c.yellow : c.blue;
                console.log(`${folderColor}${c.bright}📁 ${folderName}${c.reset}`);

                posts.forEach((post, index) => {
                    const isLast = index === posts.length - 1;
                    const branch = isLast ? '└──' : '├──';
                    const indent = isLast ? '    ' : '│   ';
                    const id = `${post.id}${c.blue}`;
                    const status = post.published ? `${c.green}[LIVE]${c.reset}` : `${c.yellow}[DRAF]${c.reset}`;
                    const date = new Date(post.updatedAt).toLocaleDateString('id-ID');

                    console.log(` ${c.gray}${branch}${c.reset} 📄 ${c.cyan}${c.bright}${post.title}${c.reset} ${status}`);
                    console.log(` ${c.blue}${indent}  ID  : ${post.id}`);
                    console.log(` ${c.gray}${indent}  Slug: ${post.slug}  |  Update: ${date}${c.reset}`);
                });
                console.log('');
            }
        } else {
            console.log(`${c.red}${c.bright}❌ [SERVER ERROR]${c.reset} ${c.red}Gagal memuat: ${result.message}${c.reset}`);
        }
    } catch (error) {
        console.log(`${c.red}${c.bright}❌ [NETWORK ERROR]${c.reset} ${c.red}Gagal menghubungi server pusat.${c.reset}`);
    }
}