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
    user_id?: number;              // the author, so their name can link to /u/<id>
    avatar?: string | null;        // the author's cookie-portrait avatar
    avatar_data?: string | null;   // or their uploaded picture
    titles?: Title[];              // their titles: array of { name, color }
    opponent_team: string[];
    counter_team: string[];
    // gear_setup holds the whole rich build (toppings, beascuits,
    // treasures, enemy levels…) as free-form JSON - see BuildDetails
    // in buildDetails.ts for the shape the submit form writes.
    gear_setup: unknown;
    note: string | null;
    likes: number;
    views?: number;
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
    role: Role;
    avatar: string | null;       // a cookie portrait filename (legacy - upload only now)
    avatarData: string | null;   // uploaded picture, as a data URI
    titles: Title[];             // owner-awarded badges
    theme: unknown;              // their saved theme, or null
    usernameChangeableAt: string | null;  // null = right now
}

export interface Title {
    name: string;
    color: string;
}

// What someone is allowed to do.
//   user  - a normal player
//   admin - can delete any community build (moderation)
//   owner - all of that, plus titles, bans and promoting admins
export type Role = 'user' | 'mod' | 'admin' | 'owner';

// someone's public profile (anyone can view anyone's)
export interface Profile {
    userId: number;
    username: string;
    avatar: string | null;
    avatarData: string | null;
    titles: Title[];
    role: Role;
    isBanned: boolean;
    banReason: string | null;
    bannedUntil: string | null;    // ISO string, null = permanent
    createdAt: string;
    isMe: boolean;         // true when you're looking at your own profile
    buildCount: number;
    totalLikes: number;
    followers: number;
    following: number;
    followedByMe: boolean;
    viewerRole: Role;      // what the person LOOKING is allowed to do
}

// Extra fields on a profile row in the admin panel
export interface StaffUser {
    user_id: number;
    username: string;
    avatar: string | null;
    avatar_data: string | null;
    titles: Title[];
    banned_at: string | null;
    banned_until: string | null;
    ban_reason: string | null;
    last_ip: string | null;
    created_at: string;
    build_count: string;
}

// one entry in a followers / following list
export interface FollowUser {
    user_id: number;
    username: string;
    avatar: string | null;
    avatar_data: string | null;
    titles: Title[];
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

// GET /api/builds?sort=likes|views|newest|featured (FR08)
export type BuildSort = 'likes' | 'views' | 'newest' | 'featured';
export function getBuilds(sort: BuildSort = 'likes') {
    return getJson<PlayerBuild[]>(`/api/builds?sort=${sort}`);
}
// old name kept for anywhere still using it
export const getTopBuilds = () => getBuilds('likes');

// POST /api/builds/:id/view - count a view (per-browser dedup done by caller)
export function countBuildView(buildId: number) {
    return postJson<{ views: number }>(`/api/builds/${buildId}/view`, {});
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

// GET /api/users/:id - anyone's profile plus their builds.
// Works logged out; your own private builds only appear for you.
// Keyed by id, so renaming never breaks a saved link.
export function getProfile(userId: number | string) {
    return getJson<{ profile: Profile; builds: PlayerBuild[] }>(
        '/api/users/' + encodeURIComponent(String(userId)));
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

// ---- following ------------------------------------------------

// POST /api/follows/:id - follow or unfollow (a toggle,
// the same way the like button works)
export function toggleFollow(userId: number) {
    return postJson<{ username: string; following: boolean; followers: number }>(
        '/api/follows/' + userId, {});
}

// GET /api/follows/:id/followers - who follows them
export function getFollowers(userId: number) {
    return getJson<{ username: string; users: FollowUser[] }>(
        `/api/follows/${userId}/followers`);
}

// GET /api/follows/:id/following - who they follow
export function getFollowing(userId: number) {
    return getJson<{ username: string; users: FollowUser[] }>(
        `/api/follows/${userId}/following`);
}

// ---- staff actions --------------------------------------------
// Every one of these is checked again on the server against the
// role stored in the database. Hiding the buttons is only tidiness;
// the 403 is the real protection.

// GET /api/users - every account (staff)
export function getAllUsers() {
    return getJson<StaffUser[]>('/api/users');
}

// GET /api/users/lookup?q=... - find an account by id OR username
export function lookupUser(q: string) {
    return getJson<StaffUser>('/api/users/lookup?q=' + encodeURIComponent(q));
}

// POST /api/users/:id/titles - award a title. Admin can only hand
// out the non-staff presets; owner can hand out anything.
export function addUserTitle(userId: number, name: string, color: string) {
    return postJson<{ userId: number; titles: Title[] }>(
        `/api/users/${userId}/titles`, { name, color });
}

// DELETE /api/users/:id/titles/:name - remove a title
export function removeUserTitle(userId: number, name: string) {
    return getJson<{ userId: number; titles: Title[] }>(
        `/api/users/${userId}/titles/${encodeURIComponent(name)}`,
        { method: 'DELETE' });
}

// POST /api/users/:id/ban  { banned, reason?, minutes?, ipBan? }
export function setUserBanned(userId: number, opts: {
    banned: boolean; reason?: string; minutes?: number | null; ipBan?: boolean;
}) {
    return postJson<{
        user_id: number; username: string;
        banned_at: string | null; banned_until: string | null;
        ban_reason: string | null; ipBan?: boolean; ipMessage?: string;
    }>(`/api/users/${userId}/ban`, opts);
}

// ---- IP bans (owner) ----------------------------------------
export interface IpBan {
    ip: string;
    reason: string | null;
    banned_at: string;
    banned_until: string | null;
}
export const getIpBans      = () => getJson<IpBan[]>('/api/ip-bans');
export const addIpBan       = (ip: string, reason?: string, minutes?: number | null) =>
    postJson<IpBan>('/api/ip-bans', { ip, reason, minutes });
export const removeIpBan    = (ip: string) =>
    getJson<{ deleted: string }>('/api/ip-bans/' + encodeURIComponent(ip), { method: 'DELETE' });

// GET /api/users/me/likes - builds I've liked
export function getLikedBuilds() {
    return getJson<PlayerBuild[]>('/api/users/me/likes');
}

// ---- themes ---------------------------------------------------

export interface SavedTheme { theme_id: number; name: string; theme: unknown; }

// PUT /api/auth/me/theme - remember the theme I'm using now
export function saveMyTheme(theme: unknown) {
    return sendJson<{ saved: boolean }>('PUT', '/api/auth/me/theme', { theme });
}

// GET /api/auth/me/themes - my saved presets
export function getMyThemes() {
    return getJson<SavedTheme[]>('/api/auth/me/themes');
}

// POST /api/auth/me/themes - save the current theme under a name
// (saving over a name you've used already replaces it)
export function saveThemePreset(name: string, theme: unknown) {
    return postJson<SavedTheme>('/api/auth/me/themes', { name, theme });
}

// DELETE /api/auth/me/themes/:id - remove one of my presets
export function deleteThemePreset(themeId: number) {
    return getJson<{ deleted: number }>(`/api/auth/me/themes/${themeId}`, { method: 'DELETE' });
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
