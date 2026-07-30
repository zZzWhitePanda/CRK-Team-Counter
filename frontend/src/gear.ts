// ============================================================
// gear.ts - the game data for cookie build customisation.
//
// All of this comes from the Cookie Run: Kingdom wiki:
//   Toppings:      https://cookierunkingdom.fandom.com/wiki/Toppings
//   Topping Tarts: https://cookierunkingdom.fandom.com/wiki/Topping_Tarts
//   Beascuits:     https://cookierunkingdom.fandom.com/wiki/Beascuits
//   Ascension:     https://cookierunkingdom.fandom.com/wiki/Cookie_Upgrading
//
// The images live in the backend's assets folders and are served
// at /images/toppings, /images/beascuits and /images/ascension
// (see server.ts). The helpers at the bottom build those URLs.
// ============================================================

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

// ---- Toppings -------------------------------------------------
// The 10 topping flavours. `key` matches the image filename.
export interface ToppingType {
    key: string;
    name: string;
    primaryStat: string;   // the main stat this topping gives
}

export const TOPPINGS: ToppingType[] = [
    { key: 'raspberry', name: 'Searing Raspberry', primaryStat: 'ATK' },
    { key: 'chocolate', name: 'Swift Chocolate', primaryStat: 'Cooldown' },
    { key: 'almond', name: 'Solid Almond', primaryStat: 'DMG Resist' },
    { key: 'caramel', name: 'Bouncy Caramel', primaryStat: 'ATK SPD' },
    { key: 'peanut', name: 'Healthy Peanut', primaryStat: 'HP' },
    { key: 'walnut', name: 'Hard Walnut', primaryStat: 'CRIT Resist' },
    { key: 'kiwi', name: 'Fresh Kiwi', primaryStat: 'DEF' },
    { key: 'candy', name: 'Sweet Candy', primaryStat: 'CRIT%' },
    { key: 'applejelly', name: 'Juicy Apple Jelly', primaryStat: 'CRIT%' },
    { key: 'hazelnut', name: 'Hearty Hazelnut', primaryStat: 'HP' },
];

// The possible sub-stats (bonus effects) a Topping can roll.
// From the wiki's "Bonus Effects" table.
export const TOPPING_SUBSTATS = [
    'ATK', 'DEF', 'HP', 'ATK SPD', 'CRIT%',
    'Cooldown', 'DMG Resist', 'CRIT Resist', 'Amplify Buff', 'Debuff Resist',
];

// ---- Beascuits ("biscuits") -----------------------------------
// 8 types, one per Cookie class. `key` matches the image filename
// AND the cookie's type, so we can suggest the matching beascuit.
export interface BeascuitType {
    key: string;        // cookie class, e.g. 'magic'
    name: string;       // in-game name
    cookieType: string; // the Cookie type it fits (matches cookies.type)
}

export const BEASCUITS: BeascuitType[] = [
    { key: 'ambush', name: 'Crispy Beascuit', cookieType: 'Ambush' },
    { key: 'defense', name: 'Hard Beascuit', cookieType: 'Defense' },
    { key: 'charge', name: 'Chewy Beascuit', cookieType: 'Charge' },
    { key: 'ranged', name: 'Light Beascuit', cookieType: 'Ranged' },
    { key: 'bomber', name: 'Spicy Beascuit', cookieType: 'Bomber' },
    { key: 'magic', name: 'Zesty Beascuit', cookieType: 'Magic' },
    { key: 'support', name: 'Hearty Beascuit', cookieType: 'Support' },
    { key: 'healing', name: 'Sweet Beascuit', cookieType: 'Healing' },
];

// A Beascuit gives ATK% and HP% plus bonus buffs. The wiki lists 4
// bonus-effect slots on a Legendary Beascuit, so the editor asks
// for these 4 stats.
export const BEASCUIT_STATS = ['ATK', 'HP', 'Bonus 1', 'Bonus 2'];

// ---- Ascension ------------------------------------------------
// Cookies can be Ascended from 1A up to 5A (shown as stars). 0 = not
// ascended. The star images are ascension/star-1.png .. star-5.png.
export const ASCENSION_LEVELS = [0, 1, 2, 3, 4, 5];

// ---- Treasures ------------------------------------------------
// Treasures are equipped to the whole TEAM (3 slots), not per cookie.
// All 45 are from https://cookierunkingdom.fandom.com/wiki/Treasure
// `key` matches the image filename in assets/treasure-images/.
export interface Treasure { key: string; name: string; }

export const TREASURES: Treasure[] = [
    { key: 'cheesebird-s-coin-purse', name: "Cheesebird's Coin Purse" },
    { key: 'gatekeeper-ghost-s-horn', name: "Gatekeeper Ghost's Horn" },
    { key: 'ginkgoblin-s-trophy-safe', name: "Ginkgoblin's Trophy Safe" },
    { key: 'squishy-jelly-watch', name: 'Squishy Jelly Watch' },
    { key: 'bear-jelly-s-lollipop', name: "Bear Jelly's Lollipop" },
    { key: 'disciple-s-magic-scroll', name: "Disciple's Magic Scroll" },
    { key: 'echo-of-the-hurricane-s-song', name: "Echo of the Hurricane's Song" },
    { key: 'grim-looking-scythe', name: 'Grim-looking Scythe' },
    { key: 'miraculous-ghost-ice-cream', name: 'Miraculous Ghost Ice Cream' },
    { key: 'pilgrim-s-slingshot', name: "Pilgrim's Slingshot" },
    { key: 'priestess-cookie-s-paper-charm', name: "Priestess Cookie's Paper Charm" },
    { key: 'acorn-snowball-with-a-tiny-cookie', name: 'Acorn Snowball With a Tiny Cookie' },
    { key: 'blossoming-acorn-bomb', name: 'Blossoming Acorn Bomb' },
    { key: 'festive-acorn-gift-box', name: 'Festive Acorn Gift Box' },
    { key: 'ice-cold-energy-drink', name: 'Ice-cold Energy Drink' },
    { key: 'blind-healer-s-staff', name: "Blind Healer's Staff" },
    { key: 'bookseller-s-monocle', name: "Bookseller's Monocle" },
    { key: 'cape-of-the-vanquisher', name: 'Cape of the Vanquisher' },
    { key: 'cursed-catacombs-candle', name: 'Cursed Catacombs Candle' },
    { key: 'divine-honey-cream-crown', name: 'Divine Honey Cream Crown' },
    { key: 'dream-conductor-s-whistle', name: "Dream Conductor's Whistle" },
    { key: 'durianeer-s-squeaky-flamingo-tube', name: "Durianeer's Squeaky Flamingo Tube" },
    { key: 'elder-pilgrim-s-torch', name: "Elder Pilgrim's Torch" },
    { key: 'explorer-s-monocle', name: "Explorer's Monocle" },
    { key: 'great-sage-s-gem', name: "Great Sage's Gem" },
    { key: 'grim-looking-electrifying-scythe', name: 'Grim-looking Electrifying Scythe' },
    { key: 'hollyberrian-royal-necklace', name: 'Hollyberrian Royal Necklace' },
    { key: 'insignia-of-the-indomitable-knights', name: 'Insignia of the Indomitable Knights' },
    { key: 'jelly-worm-s-sticky-goo', name: "Jelly Worm's Sticky Goo" },
    { key: 'librarian-s-enchanted-robes', name: "Librarian's Enchanted Robes" },
    { key: 'milk-tribe-s-frozen-torch', name: "Milk Tribe's Frozen Torch" },
    { key: 'miraculous-natural-remedy', name: 'Miraculous Natural Remedy' },
    { key: 'mysterious-jewelry-box', name: 'Mysterious Jewelry Box' },
    { key: 'mystical-silver-fork', name: 'Mystical Silver Fork' },
    { key: 'old-pilgrim-s-scroll', name: "Old Pilgrim's Scroll" },
    { key: 'sacred-pomegranate-branch', name: 'Sacred Pomegranate Branch' },
    { key: 'seamstress-s-pin-cushion', name: "Seamstress's Pin Cushion" },
    { key: 'sleepyhead-s-jelly-watch', name: "Sleepyhead's Jelly Watch" },
    { key: 'subtle-fragrant-remedy', name: 'Subtle Fragrant Remedy' },
    { key: 'sugar-swan-s-shining-feather', name: "Sugar Swan's Shining Feather" },
    { key: 'the-order-s-sacred-fork', name: "The Order's Sacred Fork" },
    { key: 'thunder-god-s-paper-charm', name: "Thunder God's Paper Charm" },
    { key: 'twinkling-starlight-crown', name: 'Twinkling Starlight Crown' },
    { key: 'unyielding-berry-necklace', name: 'Unyielding Berry Necklace' },
    { key: 'vial-of-raging-dunes', name: 'Vial of Raging Dunes' },
];

// a team's treasures = 3 slots (each a treasure key, or null if empty)
export type TeamTreasures = (string | null)[];
export function emptyTreasures(): TeamTreasures { return [null, null, null]; }

// ---- the build stored for one cookie --------------------------
export interface SubStat { stat: string; value: number; }

export interface ToppingSlot {
    toppingKey: string;   // which flavour
    isTart: boolean;      // a Topping Tart instead of a normal Topping
    substats: SubStat[];  // the bonus effects the player set
}

export interface BeascuitBuild { key: string; stats: SubStat[]; }

// The FULL build for one of YOUR cookies (used when making a
// community build). A cookie has 5 topping slots PLUS one separate
// Topping Tart slot, a beascuit, ascension and level.
export interface CookieBuild {
    toppings: (ToppingSlot | null)[];  // exactly 5 slots (normal toppings)
    tart: string | null;              // the single Topping Tart flavour (or none)
    beascuit: BeascuitBuild | null;
    ascension: number;                 // 0-5
    level: number;                     // 1-90 typically
}

// a fresh, empty build (5 empty topping slots, nothing else set)
export function emptyBuild(): CookieBuild {
    return { toppings: [null, null, null, null, null], tart: null, beascuit: null, ascension: 0, level: 1 };
}

// What you can see of an ENEMY cookie in-game: only their level and
// ascension (you can't see their toppings, tart or beascuit).
export interface EnemyInfo { ascension: number; level: number; }
export function emptyEnemyInfo(): EnemyInfo { return { ascension: 0, level: 1 }; }

// ---- image URL helpers ----------------------------------------
export function toppingImageUrl(toppingKey: string, isTart: boolean) {
    return `${API_BASE}/images/toppings/${isTart ? 'tart-' : ''}${toppingKey}.png`;
}
export function beascuitImageUrl(key: string) {
    return `${API_BASE}/images/beascuits/${key}.png`;
}
export function ascensionImageUrl(level: number) {
    return `${API_BASE}/images/ascension/star-${level}.png`;
}
export function treasureImageUrl(key: string) {
    return `${API_BASE}/images/treasures/${key}.png`;
}
