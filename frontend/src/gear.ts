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

// ---- the build stored for one cookie --------------------------
export interface SubStat { stat: string; value: number; }

export interface ToppingSlot {
    toppingKey: string;   // which flavour
    isTart: boolean;      // a Topping Tart instead of a normal Topping
    substats: SubStat[];  // the bonus effects the player set
}

export interface BeascuitBuild { key: string; stats: SubStat[]; }

export interface CookieBuild {
    toppings: (ToppingSlot | null)[];  // exactly 5 slots
    beascuit: BeascuitBuild | null;
    ascension: number;                 // 0-5
    level: number;                     // 1-90 typically
}

// a fresh, empty build (5 empty topping slots, nothing else set)
export function emptyBuild(): CookieBuild {
    return { toppings: [null, null, null, null, null], beascuit: null, ascension: 0, level: 1 };
}

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
