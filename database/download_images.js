// Downloads every cookie portrait from the wiki into
// ../assets/cookie-images/. Run once with: node download_images.js
// The artwork belongs to Devsisters; this is a school project.

const fs = require('fs');
const path = require('path');

const cookies = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));

// same naming rule as generate_cookie_seed.js
function imageFileName(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '.png';
}

// where the images go
const outDir = path.join(__dirname, '..', 'assets', 'cookie-images');
fs.mkdirSync(outDir, { recursive: true });

// ask for a 200px wide version, not the full size one
function scaledUrl(imgUrl) {
    return imgUrl + '/revision/latest/scale-to-width-down/200?format=png';
}

// download one image
async function downloadOne(cookie) {
    const file = path.join(outDir, imageFileName(cookie.name));

    // skip files we already have
    if (fs.existsSync(file)) {
        return 'skipped';
    }

    const response = await fetch(scaledUrl(cookie.img));
    if (!response.ok) {
        console.error(`  FAILED ${cookie.name}: HTTP ${response.status}`);
        return 'failed';
    }
    const data = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(file, data);
    return 'downloaded';
}

// download them a few at a time
async function main() {
    const counts = { downloaded: 0, skipped: 0, failed: 0 };
    const batchSize = 5;

    for (let i = 0; i < cookies.length; i += batchSize) {
        const batch = cookies.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(downloadOne));
        for (const r of results) counts[r]++;
        process.stdout.write(`\r${i + batch.length}/${cookies.length} done`);
    }

    console.log('\nFinished:', counts);
    if (counts.failed > 0) {
        console.log('Some downloads failed - just re-run this script,');
        console.log('already-downloaded images are skipped automatically.');
    }
}

main();
