// permissions, decided by a user's titles

export interface Title {
    name: string;
    color: string;   // hex colour
}

// the preset titles, everything else is custom
export const PRESET_TITLES = {
    owner:          { name: 'Owner',           color: '#000000' },
    admin:          { name: 'Admin',           color: '#22D3EE' },
    mod:            { name: 'Mod',             color: '#A78BFA' },
    og:             { name: 'OG',              color: '#F0C24A' },
    contentCreator: { name: 'Content Creator', color: '#EF4444' },
} as const;

// check a titles list loaded from the database
export function readTitles(value: unknown): Title[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
        .filter(t => typeof t.name === 'string' && typeof t.color === 'string')
        .map(t => ({ name: String(t.name).trim(), color: String(t.color) }))
        .filter(t => t.name.length > 0);
}

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const hasTitle = (titles: Title[], name: string) => titles.some(t => eq(t.name, name));

// powers

export const isOwner = (titles: Title[]) => hasTitle(titles, 'Owner');
export const isAdmin = (titles: Title[]) => hasTitle(titles, 'Admin') || isOwner(titles);
export const isMod   = (titles: Title[]) => hasTitle(titles, 'Mod')   || isAdmin(titles);
export const isContentCreator = (titles: Title[]) => hasTitle(titles, 'Content Creator');

// mods can delete any build
export const canDeleteAnyBuild = isMod;

// admins can ban
export const canBan = isAdmin;

// titles an admin may award, the owner may award any
const ADMIN_ASSIGNABLE = new Set(['mod', 'og', 'content creator']);

// can this person award this title?
export function canAwardTitle(actor: Title[], titleName: string): boolean {
    if (isOwner(actor)) return true;        // owner can do anything
    if (!isAdmin(actor)) return false;      // below admin, no
    return ADMIN_ASSIGNABLE.has(titleName.trim().toLowerCase());
}
