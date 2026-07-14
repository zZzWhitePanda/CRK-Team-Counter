// ============================================================
// CRK Team Builder - Cookie Image Downloader
// Flynn Zipsin - VCE Software Development SAT
//
// Downloads the portrait for every cookie in cookie_data.json
// into ../assets/cookie-images/, scaled down to 200px wide so
// the whole set stays small (about 6MB instead of ~50MB).
//
// Images come from the wiki's image server. They are only run
// once and saved into the project, so the website never hits
// the wiki while it is running.
//
// NOTE (from my SRS constraints): the cookie artwork belongs to
// Devsisters. This is a school project, not a commercial site,
// and the images are credited to the game - but if that ever
// became a problem the site still works fine with text only.
//
// Run with:  node download_images.js
// ============================================================

const fs = require('fs');
const path = require('path');

const cookies = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));

// same naming rule as generate_cookie_seed.js so the database
// image_file column always matches the actual file on disk
function imageFileName(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '.png';
}

// where the images go (folder is created if it doesn't exist)
const outDir = path.join(__dirname, '..', 'assets', 'cookie-images');
fs.mkdirSync(outDir, { recursive: true });

// asking the wiki's image server for a 200px-wide PNG version
// instead of the full-size original
function scaledUrl(imgUrl) {
    return imgUrl + '/revision/latest/scale-to-width-down/200?format=png';
}

// Download one image. fetch() is built into Node 18+.
async function downloadOne(cookie) {
    const file = path.join(outDir, imageFileName(cookie.name));

    // skip files we already have so re-running is quick
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

// Download them all, a few at a time (being polite to the server
// instead of firing all 190 requests at once).
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
