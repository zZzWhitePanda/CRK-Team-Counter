// Tidies the raw wiki values in cookie_data.json into the keys the site
// uses. The wiki writes toppings and elements as free text, so they need
// mapping before they go in the database.
// Run with: node normalise_cookie_details.js

const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, 'cookie_data.json');
const cookies = JSON.parse(fs.readFileSync(DATA, 'utf8'));

// the wiki uses its own topping names, e.g. 'swiftchocolate' for what the
// site calls 'chocolate'. Seasonal skins ('raspberry cheese') map to the
// plain flavour.
const TOPPING_KEYS = {
    raspberry: 'raspberry', searingraspberry: 'raspberry',
    chocolate: 'chocolate', swiftchocolate: 'chocolate', choco: 'chocolate',
    almond: 'almond', solidalmond: 'almond',
    caramel: 'caramel', bouncycaramel: 'caramel',
    peanut: 'peanut', healthypeanut: 'peanut',
    walnut: 'walnut', hardwalnut: 'walnut',
    kiwi: 'kiwi', freshkiwi: 'kiwi',
    candy: 'candy', sweetcandy: 'candy',
    applejelly: 'applejelly', juicyapplejelly: 'applejelly', apple: 'applejelly',
    hazelnut: 'hazelnut', heartyhazelnut: 'hazelnut',
};

const ELEMENTS = [
    'darkness', 'electricity', 'fire', 'earth', 'poison',
    'light', 'water', 'ice', 'steel', 'grass', 'wind', 'chaos',
];

// split a comma list, drop the empties
function parts(value) {
    return String(value ?? '')
        .split(/[,/]/)
        .map(p => p.trim().toLowerCase())
        .filter(Boolean);
}

function toppingKeys(value) {
    const keys = [];
    for (const part of parts(value)) {
        // strip any skin word off the end, then the spaces
        const plain = part.split(' ')[0].replace(/[^a-z]/g, '');
        const key = TOPPING_KEYS[plain];
        if (key && !keys.includes(key)) keys.push(key);
    }
    return keys;
}

function elementKeys(value) {
    const keys = [];
    // one page leaks a stray '|stats = ...' into the field, so cut at the pipe
    for (const part of parts(String(value ?? '').split('|')[0])) {
        const plain = part.replace(/[^a-z]/g, '');
        if (ELEMENTS.includes(plain) && !keys.includes(plain)) keys.push(plain);
    }
    return keys;
}

let toppingCount = 0, elementCount = 0;
for (const cookie of cookies) {
    cookie.recommendedToppings = toppingKeys(cookie.recommendedToppings);
    cookie.elements = elementKeys(cookie.element);
    delete cookie.element;
    if (cookie.recommendedToppings.length) toppingCount++;
    if (cookie.elements.length) elementCount++;
}

fs.writeFileSync(DATA, JSON.stringify(cookies, null, 2));
console.log({ toppingCount, elementCount, total: cookies.length });
