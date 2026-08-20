// sorting and grouping for the cookie roster

import { Cookie } from './api';

// low to high, the index is the rank
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

// sort by options
export type SortField = 'rarity' | 'release' | 'name' | 'type' | 'position';

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'rarity', label: 'Rarity' },
    { value: 'release', label: 'Release order' },
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'position', label: 'Position' },
];

// colour for a rarity
export function rarityColor(rarity: string): string {
    const key = rarity.toLowerCase().replace(/ /g, '-');
    return `var(--rarity-${key}, var(--color-primary))`;
}

// a section of the grid
export interface CookieGroup {
    key: string;            // heading text
    cookies: Cookie[];
}

// sort the cookies and split them into groups
export function groupCookies(
    cookies: Cookie[],
    field: SortField,
    ascending: boolean,
): CookieGroup[] {
    const byName = (a: Cookie, b: Cookie) => a.name.localeCompare(b.name);

    // name: no sections, just A-Z
    if (field === 'name') {
        const list = [...cookies].sort((a, b) => ascending ? byName(a, b) : byName(b, a));
        return [{ key: '', cookies: list }];
    }

    // release order: a section per year
    if (field === 'release') {
        const dated = cookies.filter(c => c.release_date);
        const undated = cookies.filter(c => !c.release_date);

        dated.sort((a, b) => {
            const diff = a.release_date!.localeCompare(b.release_date!);
            // same day, fall back to A-Z
            return (ascending ? diff : -diff) || byName(a, b);
        });

        const years: CookieGroup[] = [];
        for (const cookie of dated) {
            const year = cookie.release_date!.slice(0, 4);
            const last = years[years.length - 1];
            if (last && last.key === year) last.cookies.push(cookie);
            else years.push({ key: year, cookies: [cookie] });
        }
        if (undated.length > 0) years.push({ key: 'Unknown', cookies: undated });
        return years;
    }

    // everything else: one section per group
    const order = field === 'rarity' ? RARITIES
        : field === 'type' ? TYPES
        : POSITIONS;
    const sections = ascending ? order : [...order].reverse();

    const groups: CookieGroup[] = [];
    for (const key of sections) {
        const inGroup = cookies
            .filter(c => (field === 'rarity' ? c.rarity : field === 'type' ? c.type : c.position) === key)
            .sort(byName);                       // A-Z inside a section
        if (inGroup.length > 0) groups.push({ key, cookies: inGroup });
    }
    return groups;
}

// label for the direction button
export function directionLabel(field: SortField, ascending: boolean): string {
    if (field === 'name') return ascending ? 'A → Z' : 'Z → A';
    if (field === 'rarity') return ascending ? 'Common → Witch' : 'Witch → Common';
    if (field === 'release') return ascending ? 'Oldest → Newest' : 'Newest → Oldest';
    return ascending ? 'First → Last' : 'Last → First';
}

// format a release date
export function formatRelease(date: string | null): string {
    if (!date) return 'Release date unknown';
    const [y, m, d] = date.split('-').map(Number);
    // built from parts so the timezone can't shift the day
    return new Date(y, m - 1, d).toLocaleDateString('en-AU',
        { day: 'numeric', month: 'long', year: 'numeric' });
}
