// ============================================================
// buildDetails.ts - reading the rich details saved with a build.
//
// When somebody submits a build, the whole thing (every cookie's
// toppings, tart, beascuit, ascension and level, plus both teams'
// treasures) is saved into the build's gear_setup column as JSON.
// The database column is JSONB, so it can hold any shape - which
// means the frontend gets it back as `unknown` and has to CHECK
// what's in there before using it.
//
// That checking is what this file does. Older builds were saved
// before the rich format existed, so anything missing has to come
// back as empty rather than crashing the page.
// ============================================================

import { CookieBuild, EnemyInfo } from './gear';

// one of YOUR cookies, with its full build
export interface DetailedCookieBuild extends CookieBuild {
    cookie: string;
}

// one ENEMY cookie: only the level and ascension are visible in-game
export interface DetailedEnemyInfo extends EnemyInfo {
    cookie: string;
}

export interface BuildDetails {
    yourBuilds: DetailedCookieBuild[];
    enemyInfo: DetailedEnemyInfo[];
    yourTreasures: string[];
    enemyTreasures: string[];
    // false when the build was posted before builds carried this
    // detail, so the page can say so instead of showing empty boxes
    hasDetails: boolean;
}

// ---- small checkers -------------------------------------------
// `unknown` values have to be narrowed down before TypeScript will
// let us read fields off them - these do that safely.

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

// ---- the main reader ------------------------------------------

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
            // exactly 5 topping slots, so the pentagon always draws
            toppings: Array.from({ length: 5 }, (_, i) => {
                const slot = asArray(b.toppings)[i];
                if (!isObject(slot) || typeof slot.toppingKey !== 'string') return null;
                return {
                    toppingKey: slot.toppingKey,
                    isTart: slot.isTart === true,
                    substats: asArray(slot.substats)
                        .filter(isObject)
                        .filter(s => typeof s.stat === 'string')
                        .map(s => ({ stat: s.stat as string, value: asNumber(s.value, 0) })),
                };
            }),
            tart: typeof b.tart === 'string' ? b.tart : null,
            beascuit: isObject(b.beascuit) && typeof b.beascuit.key === 'string'
                ? {
                    key: b.beascuit.key,
                    stats: asArray(b.beascuit.stats)
                        .filter(isObject)
                        .filter(s => typeof s.stat === 'string')
                        .map(s => ({ stat: s.stat as string, value: asNumber(s.value, 0) })),
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
