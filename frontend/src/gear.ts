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

// ---- Ascension and Awakening ----------------------------------
// These are TWO SEPARATE systems that stack on top of each other.
//
//   Ascension  - every cookie has it, 1A to 5A, shown as the small
//                star badges (ascension/star-1.png .. star-5.png).
//
//   Awakening  - ONLY Ancient and Beast cookies. It goes up to 6,
//                one higher than ascension, and is shown as the
//                big winged star banner. Ancient and Beast have
//                DIFFERENT artwork for it (blue/purple wings vs
//                gold), so the image depends on the cookie's
//                rarity as well as the level.
//
// Both are 0 when the cookie doesn't have any.
export const ASCENSION_LEVELS = [0, 1, 2, 3, 4, 5];
export const AWAKENING_LEVELS = [0, 1, 2, 3, 4, 5, 6];

// which rarities get the awakening track at all
const AWAKENING_RARITIES = ['Ancient', 'Beast'];

/** Does this cookie rarity have the awakening system? */
export function hasAwakening(rarity: string): boolean {
    return AWAKENING_RARITIES.includes(rarity);
}

/**
 * Which awakening artwork a cookie uses. Ancient cookies get the
 * blue/purple winged stars, Beast cookies the gold ones.
 * Returns null for rarities that don't awaken at all.
 */
export function awakeningStyle(rarity: string): 'ancient' | 'beast' | null {
    if (rarity === 'Ancient') return 'ancient';
    if (rarity === 'Beast') return 'beast';
    return null;
}

// ---- Treasures ------------------------------------------------
// Treasures are equipped to the whole TEAM (3 slots), not per cookie.
// All 45 are from https://cookierunkingdom.fandom.com/wiki/Treasure
// `key` matches the image filename in assets/treasure-images/.
export interface Treasure {
    key: string;
    name: string;
    rarity: TreasureRarity;
}

// Treasure rarities, worst to best. The index in this list IS the
// rank, the same trick the cookie rarity sort uses.
export const TREASURE_RARITIES = ['Common', 'Rare', 'Special', 'Epic'] as const;
export type TreasureRarity = typeof TREASURE_RARITIES[number];

export const TREASURE_RARITY_RANK: Record<string, number> =
    Object.fromEntries(TREASURE_RARITIES.map((r, i) => [r, i]));

export const TREASURES: Treasure[] = [
    { key: 'cheesebird-s-coin-purse', name: "Cheesebird's Coin Purse", rarity: 'Common' },
    { key: 'gatekeeper-ghost-s-horn', name: "Gatekeeper Ghost's Horn", rarity: 'Common' },
    { key: 'ginkgoblin-s-trophy-safe', name: "Ginkgoblin's Trophy Safe", rarity: 'Common' },
    { key: 'squishy-jelly-watch', name: 'Squishy Jelly Watch', rarity: 'Common' },
    { key: 'bear-jelly-s-lollipop', name: "Bear Jelly's Lollipop", rarity: 'Rare' },
    { key: 'disciple-s-magic-scroll', name: "Disciple's Magic Scroll", rarity: 'Rare' },
    { key: 'echo-of-the-hurricane-s-song', name: "Echo of the Hurricane's Song", rarity: 'Rare' },
    { key: 'grim-looking-scythe', name: 'Grim-looking Scythe', rarity: 'Rare' },
    { key: 'miraculous-ghost-ice-cream', name: 'Miraculous Ghost Ice Cream', rarity: 'Rare' },
    { key: 'pilgrim-s-slingshot', name: "Pilgrim's Slingshot", rarity: 'Rare' },
    { key: 'priestess-cookie-s-paper-charm', name: "Priestess Cookie's Paper Charm", rarity: 'Rare' },
    { key: 'acorn-snowball-with-a-tiny-cookie', name: 'Acorn Snowball With a Tiny Cookie', rarity: 'Special' },
    { key: 'blossoming-acorn-bomb', name: 'Blossoming Acorn Bomb', rarity: 'Special' },
    { key: 'festive-acorn-gift-box', name: 'Festive Acorn Gift Box', rarity: 'Special' },
    { key: 'ice-cold-energy-drink', name: 'Ice-cold Energy Drink', rarity: 'Special' },
    { key: 'blind-healer-s-staff', name: "Blind Healer's Staff", rarity: 'Epic' },
    { key: 'bookseller-s-monocle', name: "Bookseller's Monocle", rarity: 'Epic' },
    { key: 'cape-of-the-vanquisher', name: 'Cape of the Vanquisher', rarity: 'Epic' },
    { key: 'cursed-catacombs-candle', name: 'Cursed Catacombs Candle', rarity: 'Epic' },
    { key: 'divine-honey-cream-crown', name: 'Divine Honey Cream Crown', rarity: 'Epic' },
    { key: 'dream-conductor-s-whistle', name: "Dream Conductor's Whistle", rarity: 'Epic' },
    { key: 'durianeer-s-squeaky-flamingo-tube', name: "Durianeer's Squeaky Flamingo Tube", rarity: 'Epic' },
    { key: 'elder-pilgrim-s-torch', name: "Elder Pilgrim's Torch", rarity: 'Epic' },
    { key: 'explorer-s-monocle', name: "Explorer's Monocle", rarity: 'Epic' },
    { key: 'great-sage-s-gem', name: "Great Sage's Gem", rarity: 'Epic' },
    { key: 'grim-looking-electrifying-scythe', name: 'Grim-looking Electrifying Scythe', rarity: 'Epic' },
    { key: 'hollyberrian-royal-necklace', name: 'Hollyberrian Royal Necklace', rarity: 'Epic' },
    { key: 'insignia-of-the-indomitable-knights', name: 'Insignia of the Indomitable Knights', rarity: 'Epic' },
    { key: 'jelly-worm-s-sticky-goo', name: "Jelly Worm's Sticky Goo", rarity: 'Epic' },
    { key: 'librarian-s-enchanted-robes', name: "Librarian's Enchanted Robes", rarity: 'Epic' },
    { key: 'milk-tribe-s-frozen-torch', name: "Milk Tribe's Frozen Torch", rarity: 'Epic' },
    { key: 'miraculous-natural-remedy', name: 'Miraculous Natural Remedy', rarity: 'Epic' },
    { key: 'mysterious-jewelry-box', name: 'Mysterious Jewelry Box', rarity: 'Epic' },
    { key: 'mystical-silver-fork', name: 'Mystical Silver Fork', rarity: 'Epic' },
    { key: 'old-pilgrim-s-scroll', name: "Old Pilgrim's Scroll", rarity: 'Epic' },
    { key: 'sacred-pomegranate-branch', name: 'Sacred Pomegranate Branch', rarity: 'Epic' },
    { key: 'seamstress-s-pin-cushion', name: "Seamstress's Pin Cushion", rarity: 'Epic' },
    { key: 'sleepyhead-s-jelly-watch', name: "Sleepyhead's Jelly Watch", rarity: 'Epic' },
    { key: 'subtle-fragrant-remedy', name: 'Subtle Fragrant Remedy', rarity: 'Epic' },
    { key: 'sugar-swan-s-shining-feather', name: "Sugar Swan's Shining Feather", rarity: 'Epic' },
    { key: 'the-order-s-sacred-fork', name: "The Order's Sacred Fork", rarity: 'Epic' },
    { key: 'thunder-god-s-paper-charm', name: "Thunder God's Paper Charm", rarity: 'Epic' },
    { key: 'twinkling-starlight-crown', name: 'Twinkling Starlight Crown', rarity: 'Epic' },
    { key: 'unyielding-berry-necklace', name: 'Unyielding Berry Necklace', rarity: 'Epic' },
    { key: 'vial-of-raging-dunes', name: 'Vial of Raging Dunes', rarity: 'Epic' },
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
    ascension: number;                 // 0-5, every cookie
    awakening: number;                 // 0-6, Ancient + Beast cookies only
    level: number;                     // 1-100
}

// Most people building a team are at or near max level, so 100 is a
// far more useful starting point than 1 - it saves typing on every
// single cookie.
export const DEFAULT_LEVEL = 100;
export const MAX_LEVEL = 100;

// a fresh, empty build (5 empty topping slots, nothing else set)
export function emptyBuild(): CookieBuild {
    return {
        toppings: [null, null, null, null, null],
        tart: null, beascuit: null,
        ascension: 0, awakening: 0, level: DEFAULT_LEVEL,
    };
}

// What you can see of an ENEMY cookie in-game: only their level,
// ascension and (for Ancient/Beast) awakening - you can't see
// their toppings, tart or beascuit.
export interface EnemyInfo { ascension: number; awakening: number; level: number; }
export function emptyEnemyInfo(): EnemyInfo {
    return { ascension: 0, awakening: 0, level: DEFAULT_LEVEL };
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

/**
 * The big winged-star banner for an awakened Ancient or Beast
 * cookie. `style` comes from awakeningStyle(cookie.rarity).
 */
export function awakeningImageUrl(style: 'ancient' | 'beast', level: number) {
    return `${API_BASE}/images/awakening/${style}-${level}.png`;
}

/**
 * The star-shaped topping board the toppings sit in.
 *
 * The game bakes the equipped Topping Tart's jewelled frame into
 * the board art, so swapping the tart swaps the whole picture -
 * no tart is a plain cookie star, a raspberry tart adds the red
 * frame, and so on. Pass null for "no tart".
 */
export function toppingBoardUrl(tartKey: string | null) {
    return `${API_BASE}/images/topping-board/${tartKey ?? 'none'}.png`;
}
export function treasureImageUrl(key: string) {
    return `${API_BASE}/images/treasures/${key}.png`;
}
