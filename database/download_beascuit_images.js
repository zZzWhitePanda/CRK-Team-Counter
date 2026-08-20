// Downloads every beascuit variant picture from the wiki into
// ../assets/beascuit-images/. Run once with: node download_beascuit_images.js
// The artwork belongs to Devsisters; this is a school project.

const fs = require('fs');
const path = require('path');

const TYPES = ['ambush', 'defense', 'charge', 'ranged', 'bomber', 'magic', 'support', 'healing'];
// the wiki numbers the artwork sets, and several elements share a set
const SETS = ['01', '02', '03', '04', '05', '06', '99'];

const OUT_DIR = path.join(__dirname, '..', 'assets', 'beascuit-images');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ask the wiki where a file actually lives
async function imageUrl(title) {
    const api = 'https://cookierunkingdom.fandom.com/api.php?action=query&format=json'
        + '&prop=imageinfo&iiprop=url&titles=' + encodeURIComponent('File:' + title);
    const res = await fetch(api, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    for (const key of Object.keys(pages)) {
        const url = pages[key]?.imageinfo?.[0]?.url;
        if (url) return url.split('/revision')[0] + '/revision/latest/scale-to-width-down/120';
    }
    return null;
}

async function download(type, set) {
    const file = `${type}-${set}.png`;
    const dest = path.join(OUT_DIR, file);
    if (fs.existsSync(dest)) return 'skipped';

    const url = await imageUrl(`Beascuit base ${type} ${set}.png`);
    if (!url) return 'missing';

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return 'failed';
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return 'ok';
}

(async () => {
    const counts = {};
    for (const type of TYPES) {
        for (const set of SETS) {
            const result = await download(type, set);
            counts[result] = (counts[result] ?? 0) + 1;
            await new Promise(r => setTimeout(r, 120));   // be polite to the server
        }
    }
    console.log(counts);
})();
