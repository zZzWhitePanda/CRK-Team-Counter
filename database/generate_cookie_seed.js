// ============================================================
// CRK Team Builder - Cookie Seed Generator
// Flynn Zipsin - VCE Software Development SAT
//
// Reads cookie_data.json (the roster scraped from the CRK wiki,
// https://cookierunkingdom.fandom.com/wiki/List_of_Cookies) and
// writes cookies_seed.sql, the INSERT statements that fill the
// cookies table.
//
// Why a script instead of typing the SQL by hand?
// - 190 cookies is way too many to type without mistakes
// - when the game adds new cookies, I just update the JSON and
//   re-run this (maintainability, NFR09)
//
// Run with:  node generate_cookie_seed.js
// ============================================================

const fs = require('fs');   // Node's built-in file system module

// ---- 1. Load the scraped cookie data --------------------------------
const cookies = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));
console.log(`Loaded ${cookies.length} cookies from cookie_data.json`);

// ---- 2. Helper: make a safe image filename from a cookie name -------
// "Pudding à la Mode Cookie" -> "pudding-a-la-mode-cookie.png"
// The images get saved under these names by download_images.js,
// and the database stores the same name so the frontend can
// find the right picture for each cookie.
function imageFileName(name) {
    return name
        .toLowerCase()
        .normalize('NFD')                 // split accented letters (à -> a + accent)
        .replace(/[̀-ͯ]/g, '')  // drop the accent marks
        .replace(/[^a-z0-9]+/g, '-')      // anything not a letter/number becomes -
        .replace(/^-|-$/g, '')            // no leading/trailing dashes
        + '.png';
}

// ---- 3. Helper: escape single quotes for SQL ------------------------
// SQL strings are wrapped in single quotes, so a name containing
// one (none do right now, but future cookies might) would break
// the INSERT unless it is doubled up ('' is how SQL writes ').
function sqlString(text) {
    return "'" + text.replace(/'/g, "''") + "'";
}

// ---- 4. Build the SQL file ------------------------------------------
let sql = `-- ============================================================
-- CRK Team Builder - Cookie Roster Seed (GENERATED FILE)
-- Do not edit by hand! Edit cookie_data.json and re-run:
--     node generate_cookie_seed.js
-- Generated: ${new Date().toISOString().slice(0, 10)}
-- Source: Cookie Run Kingdom Wiki (Fandom) - List of Cookies
-- ============================================================

TRUNCATE cookies RESTART IDENTITY CASCADE;

INSERT INTO cookies (name, type, position, rarity, image_file) VALUES
`;

const rows = cookies.map(c =>
    `(${sqlString(c.name)}, ${sqlString(c.type)}, ${sqlString(c.position)}, ` +
    `${sqlString(c.rarity)}, ${sqlString(imageFileName(c.name))})`
);

sql += rows.join(',\n') + ';\n';

// ---- 5. Save it ------------------------------------------------------
fs.writeFileSync('cookies_seed.sql', sql);
console.log(`Wrote cookies_seed.sql with ${rows.length} cookies`);

// Quick summary by rarity so I can sanity-check against the wiki
const byRarity = {};
for (const c of cookies) {
    byRarity[c.rarity] = (byRarity[c.rarity] || 0) + 1;
}
console.log('Cookies per rarity:', byRarity);
