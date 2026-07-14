// ============================================================
// api.ts - the one place the frontend talks to the backend.
// Each function matches one API endpoint. Pages import these
// instead of calling fetch() themselves, so if an endpoint
// changes only this file changes (same idea as db.ts on the
// backend).
// ============================================================

// ---- shapes of the data the API sends back ----

export interface Cookie {
    cookie_id: number;
    name: string;
    type: string;
    position: string;
    rarity: string;
    image_file: string;
}

export type GearSetup = Record<string, string>;

export interface MetaTeam {
    meta_team_id: number;
    team_name: string;
    team_cookies: string[];
    gear_setup: GearSetup | null;
    counters: string[];
    win_rate: string; // Postgres sends NUMERIC as a string
}

export interface PlayerBuild {
    build_id: number;
    username: string;
    opponent_team: string[];
    counter_team: string[];
    gear_setup: GearSetup | null;
    note: string | null;
    likes: number;
    score?: number;
}

export interface LookupResult {
    metaTeams: MetaTeam[];
    playerTeams: PlayerBuild[];
}

// ---- helper: fetch + throw a readable error if it failed ----
async function getJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        // the backend sends { error: "friendly message" } on failures
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'Something went wrong talking to the server.');
    }
    return response.json();
}

// ---- the actual endpoints ----

// GET /api/cookies with optional search/type/rarity filters (FR01)
export function getCookies(filters: { search?: string; type?: string; rarity?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.rarity) params.set('rarity', filters.rarity);
    const qs = params.toString();
    return getJson<Cookie[]>('/api/cookies' + (qs ? '?' + qs : ''));
}

// POST /api/lookup - the counter search (FR03/FR04)
export function lookupCounters(enemyTeam: string[], enemyGear: GearSetup) {
    return getJson<LookupResult>('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enemyTeam, enemyGear }),
    });
}

// GET /api/top-teams - the 10 most liked builds (FR08)
export function getTopTeams() {
    return getJson<PlayerBuild[]>('/api/top-teams');
}

// where a cookie's portrait lives (served by the backend)
export function cookieImageUrl(imageFile: string) {
    return '/images/cookies/' + imageFile;
}
