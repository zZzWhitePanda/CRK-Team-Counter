// game data for cookie builds, taken from the CRK wiki

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

// the 10 topping flavours
export interface ToppingType {
    key: string;
    name: string;
    primaryStat: string;   // main stat
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

// bonus effects a topping can roll
export const TOPPING_SUBSTATS = [
    'ATK', 'DEF', 'HP', 'ATK SPD', 'CRIT%',
    'Cooldown', 'DMG Resist', 'CRIT Resist', 'Amplify Buff', 'Debuff Resist',
];

// beascuits, one per cookie class
export interface BeascuitType {
    key: string;        // cookie class
    name: string;       // in-game name
    cookieType: string; // cookie type it fits
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

// beascuit rarities, worst to best. the rarity sets how many bonus
// effects the beascuit has
export const BEASCUIT_RARITIES = ['Common', 'Rare', 'Epic', 'Legendary'] as const;
export type BeascuitRarity = typeof BEASCUIT_RARITIES[number];

export const BEASCUIT_BONUS_SLOTS: Record<BeascuitRarity, number> = {
    Common: 1, Rare: 2, Epic: 3, Legendary: 4,
};

// the elements a tainted beascuit can carry. `adjective` is the word the
// game puts in the name, so Earth becomes 'Earthen'. `artSet` is the
// wiki's artwork number, and several elements share one set
export interface BeascuitElement {
    key: string;
    name: string;
    adjective: string;
    artSet: string;
    color: string;
}

export const BEASCUIT_ELEMENTS: BeascuitElement[] = [
    { key: 'darkness',    name: 'Darkness',    adjective: 'Dark',       artSet: '02', color: '#8B5CF6' },
    { key: 'electricity', name: 'Electricity', adjective: 'Thunderous', artSet: '02', color: '#FACC15' },
    { key: 'fire',        name: 'Fire',        adjective: 'Burning',    artSet: '03', color: '#F97316' },
    { key: 'earth',       name: 'Earth',       adjective: 'Earthen',    artSet: '03', color: '#D97706' },
    { key: 'poison',      name: 'Poison',      adjective: 'Poisonous',  artSet: '04', color: '#A3E635' },
    { key: 'light',       name: 'Light',       adjective: 'Gleaming',   artSet: '04', color: '#FDE68A' },
    { key: 'water',       name: 'Water',       adjective: 'Surging',    artSet: '04', color: '#38BDF8' },
    { key: 'ice',         name: 'Ice',         adjective: 'Frozen',     artSet: '05', color: '#A5F3FC' },
    { key: 'steel',       name: 'Steel',       adjective: 'Steelen',    artSet: '05', color: '#94A3B8' },
    { key: 'grass',       name: 'Grass',       adjective: 'Verdant',    artSet: '06', color: '#4ADE80' },
    { key: 'wind',        name: 'Wind',        adjective: 'Wuthering',  artSet: '06', color: '#CBD5E1' },
];

export function findElement(key: string | null): BeascuitElement | null {
    if (!key) return null;
    return BEASCUIT_ELEMENTS.find(e => e.key === key) ?? null;
}

// the bonus effects any beascuit can roll
export const BEASCUIT_SUBSTATS = [
    'ATK', 'DEF', 'HP', 'ATK SPD', 'CRIT%', 'DMG Resist', 'CRIT Resist',
    'Cooldown', 'Amplify Buff', 'Debuff Resist', 'DMG Resist Bypass',
];

// an elemental beascuit can also roll its own element's DMG bonus, which a
// plain one cannot, so the options depend on the element
export function beascuitSubstatOptions(elementKey: string | null): string[] {
    const element = findElement(elementKey);
    return element ? [element.name + ' DMG', ...BEASCUIT_SUBSTATS] : [...BEASCUIT_SUBSTATS];
}

// the full in-game name, e.g. 'Legendary Earthen Zesty Beascuit'
export function beascuitName(
    typeKey: string, rarity: BeascuitRarity, elementKey: string | null, anniversary = false,
): string {
    const type = BEASCUITS.find(b => b.key === typeKey);
    const flavour = type ? type.name.replace(' Beascuit', '') : '';
    const element = findElement(elementKey);
    const parts = [anniversary ? '4th Anniversary' : '', rarity, element ? element.adjective : '', flavour, 'Beascuit'];
    return parts.filter(Boolean).join(' ');
}

// ascension (1-5, all cookies) and awakening (1-6, Ancient/Beast only)
export const ASCENSION_LEVELS = [0, 1, 2, 3, 4, 5];
export const AWAKENING_LEVELS = [0, 1, 2, 3, 4, 5, 6];

// rarities that awaken
const AWAKENING_RARITIES = ['Ancient', 'Beast'];

// does this rarity awaken?
export function hasAwakening(rarity: string): boolean {
    return AWAKENING_RARITIES.includes(rarity);
}

// which awakening artwork to use
export function awakeningStyle(rarity: string): 'ancient' | 'beast' | null {
    if (rarity === 'Ancient') return 'ancient';
    if (rarity === 'Beast') return 'beast';
    return null;
}

// treasures, equipped to the team in 3 slots
export interface Treasure {
    key: string;
    name: string;
    rarity: TreasureRarity;
}

// treasure rarities, worst to best
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

// a team's 3 treasure slots
export type TeamTreasures = (string | null)[];
export function emptyTreasures(): TeamTreasures { return [null, null, null]; }

// the build for one cookie
export interface SubStat { stat: string; value: number; }

export interface ToppingSlot {
    toppingKey: string;   // flavour
    isTart: boolean;      // tart instead of normal topping
    substats: string[];   // bonus effects, names only
}

export interface BeascuitBuild {
    key: string;                 // the type, e.g. 'magic'
    rarity: BeascuitRarity;      // decides how many bonus effects it has
    element: string | null;      // null on a plain beascuit
    anniversary?: boolean;       // the 4th Anniversary version
    substats: string[];          // one per bonus slot, names only
}

// a fresh beascuit of the given type, with empty bonus slots
export function emptyBeascuit(typeKey: string): BeascuitBuild {
    return { key: typeKey, rarity: 'Legendary', element: null, substats: [] };
}

// the full build for one of your cookies
export interface CookieBuild {
    toppings: (ToppingSlot | null)[];  // 5 slots
    tart: string | null;              // topping tart flavour
    beascuit: BeascuitBuild | null;
    ascension: number;                 // 0-5
    awakening: number;                 // 0-6, Ancient/Beast only
    level: number;                     // 1-100
}

// most players are near max level, so start there
export const DEFAULT_LEVEL = 100;
export const MAX_LEVEL = 100;

// a fresh, empty build
export function emptyBuild(): CookieBuild {
    return {
        toppings: [null, null, null, null, null],
        tart: null, beascuit: null,
        ascension: 0, awakening: 0, level: DEFAULT_LEVEL,
    };
}

// what you can see of an enemy cookie in game
export interface EnemyInfo { ascension: number; awakening: number; level: number; }
export function emptyEnemyInfo(): EnemyInfo {
    return { ascension: 0, awakening: 0, level: DEFAULT_LEVEL };
}

// image url helpers
export function toppingImageUrl(toppingKey: string, isTart: boolean) {
    return `${API_BASE}/images/toppings/${isTart ? 'tart-' : ''}${toppingKey}.png`;
}
// the artwork changes with the element, so an Earthen beascuit does not
// look like a plain one
export function beascuitImageUrl(key: string, elementKey: string | null = null, anniversary = false) {
    const element = findElement(elementKey);
    const set = anniversary ? '99' : (element ? element.artSet : '01');
    return `${API_BASE}/images/beascuits/${key}-${set}.png`;
}

// the plain picture, used when a variant one is missing
export function beascuitFallbackUrl(key: string) {
    return `${API_BASE}/images/beascuits/${key}.png`;
}
export function ascensionImageUrl(level: number) {
    return `${API_BASE}/images/ascension/star-${level}.png`;
}

// the winged star banner for an awakened cookie
export function awakeningImageUrl(style: 'ancient' | 'beast', level: number) {
    return `${API_BASE}/images/awakening/${style}-${level}.png`;
}

// the topping board, art changes with the equipped tart
export function toppingBoardUrl(tartKey: string | null) {
    return `${API_BASE}/images/topping-board/${tartKey ?? 'none'}.png`;
}
export function treasureImageUrl(key: string) {
    return `${API_BASE}/images/treasures/${key}.png`;
}
