// reads the build details saved in gear_setup JSON

import { CookieBuild, EnemyInfo, BEASCUIT_RARITIES, BeascuitRarity } from './gear';

// one of your cookies
export interface DetailedCookieBuild extends CookieBuild {
    cookie: string;
}

// one enemy cookie
export interface DetailedEnemyInfo extends EnemyInfo {
    cookie: string;
}

export interface BuildDetails {
    yourBuilds: DetailedCookieBuild[];
    enemyInfo: DetailedEnemyInfo[];
    yourTreasures: string[];
    enemyTreasures: string[];
    // false on older builds with no details
    hasDetails: boolean;
}

// type checkers

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStrings(value: unknown): string[] {
    return asArray(value).filter((v): v is string => typeof v === 'string');
}

// Substats are saved as plain names now. Builds posted before that change
// saved them as { stat, value } objects, so both shapes are read here and
// the old value is dropped.
function asSubstatNames(value: unknown): string[] {
    return asArray(value)
        .map(entry => {
            if (typeof entry === 'string') return entry;
            if (isObject(entry) && typeof entry.stat === 'string') return entry.stat;
            return null;
        })
        .filter((name): name is string => name !== null && name.trim() !== '');
}

function asRarity(value: unknown): BeascuitRarity {
    return BEASCUIT_RARITIES.includes(value as BeascuitRarity)
        ? value as BeascuitRarity : 'Legendary';
}

// the main reader

export function readBuildDetails(gearSetup: unknown): BuildDetails {
    const empty: BuildDetails = {
        yourBuilds: [], enemyInfo: [],
        yourTreasures: [], enemyTreasures: [],
        hasDetails: false,
    };
    if (!isObject(gearSetup)) return empty;

    const yourBuilds: DetailedCookieBuild[] = asArray(gearSetup.yourBuilds)
        .filter(isObject)
        .filter(b => typeof b.cookie === 'string')
        .map(b => ({
            cookie: b.cookie as string,
            // always 5 slots
            toppings: Array.from({ length: 5 }, (_, i) => {
                const slot = asArray(b.toppings)[i];
                if (!isObject(slot) || typeof slot.toppingKey !== 'string') return null;
                return {
                    toppingKey: slot.toppingKey,
                    isTart: slot.isTart === true,
                    substats: asSubstatNames(slot.substats),
                };
            }),
            tart: typeof b.tart === 'string' ? b.tart : null,
            beascuit: isObject(b.beascuit) && typeof b.beascuit.key === 'string'
                ? {
                    key: b.beascuit.key,
                    rarity: asRarity(b.beascuit.rarity),
                    element: typeof b.beascuit.element === 'string' ? b.beascuit.element : null,
                    anniversary: b.beascuit.anniversary === true,
                    // `stats` is the old field name, kept so older builds still open
                    substats: asSubstatNames(b.beascuit.substats ?? b.beascuit.stats),
                }
                : null,
            ascension: asNumber(b.ascension, 0),
            awakening: asNumber(b.awakening, 0),
            level: asNumber(b.level, 1),
        }));

    const enemyInfo: DetailedEnemyInfo[] = asArray(gearSetup.enemyInfo)
        .filter(isObject)
        .filter(e => typeof e.cookie === 'string')
        .map(e => ({
            cookie: e.cookie as string,
            ascension: asNumber(e.ascension, 0),
            awakening: asNumber(e.awakening, 0),
            level: asNumber(e.level, 1),
        }));

    const yourTreasures = asStrings(gearSetup.yourTreasures);
    const enemyTreasures = asStrings(gearSetup.enemyTreasures);

    return {
        yourBuilds, enemyInfo, yourTreasures, enemyTreasures,
        hasDetails: yourBuilds.length > 0 || enemyInfo.length > 0
            || yourTreasures.length > 0 || enemyTreasures.length > 0,
    };
}
