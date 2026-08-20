// Adds skill and element details to cookie_data.json, read from each
// cookie's page on the CRK wiki. Run with: node scrape_cookie_details.js
// The game data belongs to Devsisters; this is a school project.

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'cookie_data.json');
const cookies = JSON.parse(fs.readFileSync(DATA, 'utf8'));

// pull one "|field = value" line out of a wiki template
function field(text, name) {
    const re = new RegExp('\\|\\s*' + name + '\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\||\\n\\}\\})', 'i');
    const match = text.match(re);
    return match ? match[1].trim() : '';
}

// wiki markup to plain text
function clean(text) {
    return text
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\{\{Color\|([^|}]*)\|[^}]*\}\}/gi, '$1')
        .replace(/\{\{Status\|([^|}]*)\}\}/gi, '$1')
        .replace(/\{\{Type\|([^|}]*)\}\}/gi, '$1')
        .replace(/\{\{[^{}]*\}\}/g, '')
        .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
        .replace(/\[\[([^\]]*)\]\]/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/'''?/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function wikitext(title) {
    const url = 'https://cookierunkingdom.fandom.com/api.php?action=parse&format=json&prop=wikitext'
        + '&page=' + encodeURIComponent(title);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.parse?.wikitext?.['*'] ?? null;
}

async function details(name) {
    const text = await wikitext(name);
    if (!text) return null;

    // the skill lives in its own template, so cut that part out first
    const skillStart = text.indexOf('{{Skill box');
    const skillBox = skillStart === -1 ? '' : text.slice(skillStart, skillStart + 4000);

    const quote = text.match(/\{\{Quote\|([^}]*)\}\}/);
    const description = text.match(/==\s*Game Description\s*==\s*''([\s\S]*?)''/);

    return {
        element: clean(field(text, 'elements')).toLowerCase() || null,
        recommendedToppings: clean(field(text, 'toppings')).toLowerCase() || null,
        traits: clean(field(text, 'traits')) || null,
        voiceActor: clean(field(text, 'va_eng')) || null,
        skillName: clean(field(skillBox, 'Name')) || null,
        skillCooldown: clean(field(skillBox, 'Cooldown')) || null,
        skillDescription: clean(field(skillBox, 'Description')) || null,
        quote: quote ? clean(quote[1]) : null,
        description: description ? clean(description[1]).slice(0, 1200) : null,
    };
}

(async () => {
    let found = 0, missed = 0;
    for (const cookie of cookies) {
        if (cookie.skillName !== undefined) { found++; continue; }   // already done
        try {
            const extra = await details(cookie.name);
            if (extra && extra.skillName) { Object.assign(cookie, extra); found++; }
            else { Object.assign(cookie, extra ?? {}); missed++; }
        } catch {
            missed++;
        }
        await new Promise(r => setTimeout(r, 150));   // be polite to the server
        if ((found + missed) % 25 === 0) {
            console.log(`${found + missed} / ${cookies.length}`);
            fs.writeFileSync(DATA, JSON.stringify(cookies, null, 2));
        }
    }
    fs.writeFileSync(DATA, JSON.stringify(cookies, null, 2));
    console.log({ found, missed });
})();
