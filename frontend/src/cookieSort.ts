// ============================================================
// cookieSort.ts - the shared sorting + grouping rules for the
// cookie roster. Used by BOTH the Cookies page and the cookie
// picker so they always behave the same way.
//
// The layout follows paimon.moe: when you sort by a category
// (rarity / type / position) the cookies are split into sections
// with a heading for each group, instead of one long flat list.
// ============================================================

import { Cookie } from './api';

// low -> high, so the index of each rarity is its rank
export const RARITIES = [
    'Common', 'Rare', 'Special', 'Epic', 'Super Epic',
    'Dragon', 'Legendary', 'Ancient', 'Beast', 'Witch',
];
export const RARITY_RANK: Record<string, number> =
    Object.fromEntries(RARITIES.map((r, i) => [r, i]));

export const TYPES = [
    'Charge', 'Defense', 'Magic', 'Ambush', 'Support',
    'Bomber', 'Ranged', 'Healing', 'BTS',
];
export const POSITIONS = ['Front', 'Middle', 'Rear'];

// the options in the "Sort by" drop-down
export type SortField = 'rarity' | 'name' | 'type' | 'position';

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'rarity', label: 'Rarity' },
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'position', label: 'Position' },
];

// each rarity gets its own accent colour (the CSS variables live in
// theme.css) so the roster is colour-coded at a glance.
export function rarityColor(rarity: string): string {
    const key = rarity.toLowerCase().replace(/ /g, '-');
    return `var(--rarity-${key}, var(--color-primary))`;
}

// one section of the grid: a heading plus the cookies under it
export interface CookieGroup {
    key: string;            // the heading text ('Beast', 'Magic', …)
    cookies: Cookie[];
}

/**
 * Sort the cookies and split them into groups.
 * Sorting by name gives a single unnamed group (a plain A-Z list);
 * every other field gives one group per rarity / type / position.
 */
export function groupCookies(
    cookies: Cookie[],
    field: SortField,
    ascending: boolean,
): CookieGroup[] {
    const byName = (a: Cookie, b: Cookie) => a.name.localeCompare(b.name);

    // --- name: no sections, just A-Z (or Z-A) ---
    if (field === 'name') {
        const list = [...cookies].sort((a, b) => ascending ? byName(a, b) : byName(b, a));
        return [{ key: '', cookies: list }];
    }

    // --- everything else: one section per group ---
    // the order the sections appear in
    const order = field === 'rarity' ? RARITIES
        : field === 'type' ? TYPES
        : POSITIONS;
    const sections = ascending ? order : [...order].reverse();

    const groups: CookieGroup[] = [];
    for (const key of sections) {
        const inGroup = cookies
            .filter(c => (field === 'rarity' ? c.rarity : field === 'type' ? c.type : c.position) === key)
            .sort(byName);                       // inside a section, always A-Z
        if (inGroup.length > 0) groups.push({ key, cookies: inGroup });
    }
    return groups;
}

// the little label under the direction button, e.g. "Common → Beast"
export function directionLabel(field: SortField, ascending: boolean): string {
    if (field === 'name') return ascending ? 'A → Z' : 'Z → A';
    if (field === 'rarity') return ascending ? 'Common → Beast' : 'Beast → Common';
    return ascending ? 'First → Last' : 'Last → First';
}
