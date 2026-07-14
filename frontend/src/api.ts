// ============================================================
// api.ts - the one place the frontend talks to the backend.
// Each function matches one API endpoint. Pages import these
// instead of calling fetch() themselves, so if an endpoint
// changes only this file changes (same idea as db.ts on the
// backend).
// ============================================================

// Where the backend lives. In development this is '' (empty), so
// requests go to the same address and Vite's proxy forwards them
// to localhost:4000. In production (Vercel) the backend is a
// different server, so its address is set with the VITE_API_URL
// environment variable when the site is built.
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

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
    let response: Response;
    try {
        response = await fetch(API_BASE + url, options);
    } catch {
        // network dropped mid-request (user offline, server down)
        throw new Error("Can't reach the server right now — check your connection and try again.");
    }

    // Read the reply as text first, then try to turn it into JSON.
    // If the backend is down/misconfigured the reply might be an
    // HTML error page - parsing that with .json() would throw a
    // confusing technical error at the user, which UC07 forbids.
    const text = await response.text();
    let body: { error?: string } | null = null;
    try {
        body = JSON.parse(text);
    } catch {
        body = null; // reply wasn't JSON - treat as server unavailable
    }

    if (!response.ok || body === null) {
        // the backend sends { error: "friendly message" } on failures
        throw new Error(body?.error ?? "The server isn't available right now — please try again later.");
    }
    return body as T;
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
    return API_BASE + '/images/cookies/' + imageFile;
}
