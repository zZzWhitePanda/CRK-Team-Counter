// Turns cookie_data.json (scraped from the CRK wiki) into
// cookies_seed.sql. Run with: node generate_cookie_seed.js

const fs = require('fs');   // Node's built-in file system module

// 1. load the data
const cookies = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));
console.log(`Loaded ${cookies.length} cookies from cookie_data.json`);

// 2. turn a cookie name into a filename,
// e.g. "Pudding a la Mode Cookie" -> "pudding-a-la-mode-cookie.png"
function imageFileName(name) {
    return name
        .toLowerCase()
        .normalize('NFD')                 // split accented letters (à -> a + accent)
        .replace(/[̀-ͯ]/g, '')  // drop the accent marks
        .replace(/[^a-z0-9]+/g, '-')      // anything not a letter/number becomes -
        .replace(/^-|-$/g, '')            // no leading/trailing dashes
        + '.png';
}

// 3. double up single quotes so they don't break the SQL
function sqlString(text) {
    return "'" + text.replace(/'/g, "''") + "'";
}

// 4. build the SQL
let sql = `-- Cookie roster seed. GENERATED FILE - don't edit by hand.
-- Edit cookie_data.json and re-run: node generate_cookie_seed.js
-- Generated: ${new Date().toISOString().slice(0, 10)}. Source: Cookie Run Kingdom Wiki

TRUNCATE cookies RESTART IDENTITY CASCADE;

INSERT INTO cookies (name, type, position, rarity, image_file, release_date,
                     elements, recommended_toppings, skill_name, skill_cooldown,
                     skill_description, quote, description, traits, voice_actor) VALUES
`;

// a Postgres text array, e.g. ARRAY['earth']::text[]
function sqlArray(values) {
    const list = Array.isArray(values) ? values : [];
    if (list.length === 0) return `'{}'::text[]`;
    return `ARRAY[${list.map(sqlString).join(', ')}]::text[]`;
}

// NULL rather than an empty string, so the page can tell the two apart
function sqlOrNull(value) {
    return value ? sqlString(String(value)) : 'NULL';
}

const rows = cookies.map(c =>
    `(${sqlString(c.name)}, ${sqlString(c.type)}, ${sqlString(c.position)}, ` +
    `${sqlString(c.rarity)}, ${sqlString(imageFileName(c.name))}, ` +
    // NULL when the scrape couldn't find a date
    `${c.release ? sqlString(c.release) : 'NULL'}, ` +
    `${sqlArray(c.elements)}, ${sqlArray(c.recommendedToppings)}, ` +
    `${sqlOrNull(c.skillName)}, ${sqlOrNull(c.skillCooldown)}, ` +
    `${sqlOrNull(c.skillDescription)}, ${sqlOrNull(c.quote)}, ` +
    `${sqlOrNull(c.description)}, ${sqlOrNull(c.traits)}, ${sqlOrNull(c.voiceActor)})`
);

sql += rows.join(',\n') + ';\n';

// 5. save it
fs.writeFileSync('cookies_seed.sql', sql);
console.log(`Wrote cookies_seed.sql with ${rows.length} cookies`);

// a summary to check against the wiki
const byRarity = {};
for (const c of cookies) {
    byRarity[c.rarity] = (byRarity[c.rarity] || 0) + 1;
}
console.log('Cookies per rarity:', byRarity);
