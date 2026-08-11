// ============================================================
// permissions.ts - what someone is allowed to do.
//
// Under the old system, users had a `role` column that decided
// this. Now the SAME idea is driven by their TITLES: having the
// Owner title makes you an owner, Admin makes you an admin, and
// so on. Same result, but titles are visible and the site-owner
// can hand out and take away permissions by editing titles.
//
// The five preset titles carry a fixed meaning:
//
//   Owner            - everything: award/remove any title, ban,
//                      promote/demote admins, delete builds
//   Admin            - award the non-staff preset titles
//                      (Mod, OG, Content Creator), ban, delete
//                      builds. May NOT award custom titles or
//                      the Owner/Admin titles.
//   Mod              - delete any community build only
//   OG               - a coloured badge, no powers
//   Content Creator  - a coloured badge, no powers
//
// Custom titles (any other name) never grant powers - they only
// look nice.
// ============================================================

export interface Title {
    name: string;
    color: string;   // '#rrggbb'
}

// The presets. Everything else is a "custom" title.
export const PRESET_TITLES = {
    owner:          { name: 'Owner',           color: '#000000' },
    admin:          { name: 'Admin',           color: '#22D3EE' },
    mod:            { name: 'Mod',             color: '#A78BFA' },
    og:             { name: 'OG',              color: '#F0C24A' },
    contentCreator: { name: 'Content Creator', color: '#EF4444' },
} as const;

/**
 * Is `titles` a valid list of {name, color} objects? Data coming
 * out of the JSONB column is `unknown`, so it has to be checked
 * before it can be used.
 */
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

// ---- effective powers ---------------------------------------

export const isOwner = (titles: Title[]) => hasTitle(titles, 'Owner');
export const isAdmin = (titles: Title[]) => hasTitle(titles, 'Admin') || isOwner(titles);
export const isMod   = (titles: Title[]) => hasTitle(titles, 'Mod')   || isAdmin(titles);
export const isContentCreator = (titles: Title[]) => hasTitle(titles, 'Content Creator');

/** Deleting community builds - the moderator's job. */
export const canDeleteAnyBuild = isMod;

/** Banning accounts. Admins and up. */
export const canBan = isAdmin;

// ---- who can award WHICH title ------------------------------
// Only the owner can hand out Owner or Admin, and only the owner
// can invent custom titles.  Admins can only hand out the three
// non-staff presets.
const ADMIN_ASSIGNABLE = new Set(['mod', 'og', 'content creator']);

/** Can `actor` award a title with this name to somebody? */
export function canAwardTitle(actor: Title[], titleName: string): boolean {
    if (isOwner(actor)) return true;        // owner does the lot
    if (!isAdmin(actor)) return false;      // below admin: no
    return ADMIN_ASSIGNABLE.has(titleName.trim().toLowerCase());
}
