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
// different server, set with the VITE_API_URL environment
// variable when the site is built.
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

// ---- login token storage --------------------------------------
// After login the backend gives us a token. We keep it in the
// browser's localStorage so the user stays logged in across page
// reloads, and send it on every request that needs an account.
const TOKEN_KEY = 'crk_token';
export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// ---- shapes of the data the API sends back --------------------

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
    likedByMe?: boolean;   // only set when logged in
    score?: number;
}

export interface LookupResult {
    metaTeams: MetaTeam[];
    playerTeams: PlayerBuild[];
}

export interface AuthUser {
    userId: number;
    username: string;
    email: string;
    isAdmin: boolean;
}

// ---- helper: fetch + throw a readable error if it failed ------
async function getJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    // attach the login token (if we have one) to every request
    const token = getToken();
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', 'Bearer ' + token);

    let response: Response;
    try {
        response = await fetch(API_BASE + url, { ...options, headers });
    } catch {
        // network dropped mid-request (user offline, server down)
        throw new Error("Can't reach the server right now — check your connection and try again.");
    }

    // Read the reply as text first, then try to turn it into JSON.
    // If the backend is down/misconfigured the reply might be an
    // HTML error page - parsing that with .json() would throw a
    // confusing technical error at the user, which UC07 forbids.
    const text = await response.text();
    let body: unknown = null;
    try { body = JSON.parse(text); } catch { body = null; }

    if (!response.ok || body === null) {
        const msg = (body as { error?: string })?.error;
        throw new Error(msg ?? "The server isn't available right now — please try again later.");
    }
    return body as T;
}

// small helper for POSTing JSON
function postJson<T>(url: string, data: unknown): Promise<T> {
    return getJson<T>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// ---- cookies --------------------------------------------------

// GET /api/cookies with optional search/type/rarity filters (FR01)
export function getCookies(filters: { search?: string; type?: string; rarity?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.rarity) params.set('rarity', filters.rarity);
    const qs = params.toString();
    return getJson<Cookie[]>('/api/cookies' + (qs ? '?' + qs : ''));
}

// ---- counter lookup -------------------------------------------

// POST /api/lookup - the counter search (FR03/FR04)
export function lookupCounters(enemyTeam: string[], enemyGear: GearSetup) {
    return postJson<LookupResult>('/api/lookup', { enemyTeam, enemyGear });
}

// ---- community builds -----------------------------------------

// GET /api/builds/top - most liked builds (FR08)
export function getTopBuilds() {
    return getJson<PlayerBuild[]>('/api/builds/top');
}

// POST /api/builds - submit a build (login required, FR05)
export function submitBuild(build: {
    opponentTeam: string[];
    counterTeam: string[];
    gearSetup: GearSetup;
    note: string;
}) {
    return postJson<PlayerBuild>('/api/builds', build);
}

// POST /api/builds/:id/like - like / unlike (login required, FR06/07)
export function likeBuild(buildId: number) {
    return postJson<{ likes: number; likedByMe: boolean }>(`/api/builds/${buildId}/like`, {});
}

// ---- auth -----------------------------------------------------

export function signup(data: { username: string; email: string; password: string }) {
    return postJson<{ token: string; user: AuthUser }>('/api/auth/signup', data);
}
export function login(data: { email: string; password: string }) {
    return postJson<{ token: string; user: AuthUser }>('/api/auth/login', data);
}
export function getMe() {
    return getJson<{ user: AuthUser }>('/api/auth/me');
}

// where a cookie's portrait lives (served by the backend)
export function cookieImageUrl(imageFile: string) {
    return API_BASE + '/images/cookies/' + imageFile;
}
