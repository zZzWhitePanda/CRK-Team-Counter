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
    release_date: string | null;   // 'YYYY-MM-DD' - powers the release-order sort
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
    avatar?: string | null;        // the author's cookie-portrait avatar
    avatar_data?: string | null;   // or their uploaded picture
    opponent_team: string[];
    counter_team: string[];
    // gear_setup holds the whole rich build (toppings, beascuits,
    // treasures, enemy levels…) as free-form JSON - see BuildDetails
    // in buildDetails.ts for the shape the submit form writes.
    gear_setup: unknown;
    note: string | null;
    likes: number;
    likedByMe?: boolean;   // only set when logged in
    is_public?: boolean;
    created_at?: string;
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
    avatar: string | null;       // a cookie portrait filename
    avatarData: string | null;   // or an uploaded picture, as a data URI
}

// someone's public profile (anyone can view anyone's)
export interface Profile {
    userId: number;
    username: string;
    avatar: string | null;
    avatarData: string | null;
    isAdmin: boolean;
    createdAt: string;
    isMe: boolean;         // true when you're looking at your own profile
    buildCount: number;
    totalLikes: number;
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

// small helpers for sending JSON. POST creates, PATCH changes part
// of something that already exists, DELETE removes it.
function sendJson<T>(method: string, url: string, data: unknown): Promise<T> {
    return getJson<T>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
const postJson = <T,>(url: string, data: unknown) => sendJson<T>('POST', url, data);
const patchJson = <T,>(url: string, data: unknown) => sendJson<T>('PATCH', url, data);

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

// POST /api/builds - submit a build (login required, FR05).
// gearSetup carries the full build details (toppings, beascuits,
// treasures, enemy info…) as JSON; the backend stores it as JSONB,
// so it can be any shape - hence `unknown` rather than GearSetup.
export function submitBuild(build: {
    opponentTeam: string[];
    counterTeam: string[];
    gearSetup: unknown;
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

// ---- profiles -------------------------------------------------

// PATCH /api/auth/me - change your username and/or profile picture.
// Send only what you're changing. avatar = a cookie portrait
// filename, avatarData = an uploaded picture as a data URI; setting
// one clears the other. The backend returns a fresh token because
// the username is stored inside it.
export function updateProfile(changes: {
    username?: string;
    avatar?: string | null;
    avatarData?: string | null;
}) {
    return patchJson<{ token: string; user: AuthUser }>('/api/auth/me', changes);
}

// GET /api/users/:username - anyone's profile plus their builds.
// Works logged out; your own private builds only appear for you.
export function getProfile(username: string) {
    return getJson<{ profile: Profile; builds: PlayerBuild[] }>(
        '/api/users/' + encodeURIComponent(username));
}

// PATCH /api/builds/:id - show a build to everyone, or hide it (owner only)
export function setBuildPrivacy(buildId: number, isPublic: boolean) {
    return patchJson<{ build_id: number; is_public: boolean }>(
        `/api/builds/${buildId}`, { isPublic });
}

// DELETE /api/builds/:id - remove one of your own builds
export function deleteBuild(buildId: number) {
    return getJson<{ deleted: number }>(`/api/builds/${buildId}`, { method: 'DELETE' });
}

// ---- picture helpers ------------------------------------------

// where a cookie's portrait lives (served by the backend)
export function cookieImageUrl(imageFile: string) {
    return API_BASE + '/images/cookies/' + imageFile;
}

// Works out what to show as someone's profile picture:
// an uploaded picture wins, then a chosen cookie portrait, then
// null (the Avatar component falls back to their initial).
export function avatarUrl(
    who: { avatar?: string | null; avatarData?: string | null;
           avatar_data?: string | null } | null | undefined
): string | null {
    if (!who) return null;
    const uploaded = who.avatarData ?? who.avatar_data;
    if (uploaded) return uploaded;                       // already a data: URI
    if (who.avatar) return cookieImageUrl(who.avatar);
    return null;
}
