// all backend calls, one function per endpoint

// backend address, empty in development
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

// login token storage
const TOKEN_KEY = 'crk_token';
export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// data shapes from the API

export interface Cookie {
    cookie_id: number;
    name: string;
    type: string;
    position: string;
    rarity: string;
    image_file: string;
    release_date: string | null;   // used by the release-order sort

    // the detail popup fields, scraped from the wiki. Older cookies have
    // no element, because elements were added to the game later on
    elements?: string[];
    recommended_toppings?: string[];
    skill_name?: string | null;
    skill_cooldown?: string | null;
    skill_description?: string | null;
    quote?: string | null;
    description?: string | null;
    traits?: string | null;
    voice_actor?: string | null;
}

export type GearSetup = Record<string, string>;

export interface MetaTeam {
    meta_team_id: number;
    team_name: string;
    team_cookies: string[];
    gear_setup: GearSetup | null;
    counters: string[];
    win_rate: string; // postgres sends numbers as strings
    matched?: number;
    searched?: number;
    exact?: boolean;
}

export interface PlayerBuild {
    build_id: number;
    username: string;
    user_id?: number;              // the author
    avatar?: string | null;        // cookie portrait avatar
    avatar_data?: string | null;   // uploaded picture
    titles?: Title[];              // their titles
    opponent_team: string[];
    counter_team: string[];
    // gear_setup holds the full build as JSON, see buildDetails.ts
    gear_setup: unknown;
    note: string | null;
    likes: number;
    views?: number;
    likedByMe?: boolean;   // only when logged in
    is_public?: boolean;
    created_at?: string;
    score?: number;
    // only set by the counter lookup
    matched?: number;      // enemy cookies shared
    searched?: number;     // cookies searched for
    exact?: boolean;       // exact match
    anyTeam?: boolean;     // posted with no enemy team
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
    avatar: string | null;       // cookie portrait filename
    avatarData: string | null;   // uploaded picture
    titles: Title[];             // badges
    theme: unknown;              // saved theme
    usernameChangeableAt: string | null;  // null = now
}

export interface Title {
    name: string;
    color: string;
}

// permission level
export type Role = 'user' | 'mod' | 'admin' | 'owner';

// public profile
export interface Profile {
    userId: number;
    username: string;
    avatar: string | null;
    avatarData: string | null;
    titles: Title[];
    role: Role;
    isBanned: boolean;
    banReason: string | null;
    bannedUntil: string | null;    // null = permanent
    createdAt: string;
    isMe: boolean;         // your own profile
    buildCount: number;
    totalLikes: number;
    followers: number;
    following: number;
    followedByMe: boolean;
    viewerRole: Role;      // the viewer's role
}

// extra admin panel fields
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

// a followers / following entry
export interface FollowUser {
    user_id: number;
    username: string;
    avatar: string | null;
    avatar_data: string | null;
    titles: Title[];
}

// fetch helper with readable errors
async function getJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    // attach the login token
    const token = getToken();
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', 'Bearer ' + token);

    let response: Response;
    try {
        response = await fetch(API_BASE + url, { ...options, headers });
    } catch {
        // no connection
        throw new Error("Can't reach the server right now — check your connection and try again.");
    }

    // read as text first, the reply might not be JSON
    const text = await response.text();
    let body: unknown = null;
    try { body = JSON.parse(text); } catch { body = null; }

    if (!response.ok || body === null) {
        const msg = (body as { error?: string })?.error;
        throw new Error(msg ?? "The server isn't available right now — please try again later.");
    }
    return body as T;
}

// send JSON helpers
function sendJson<T>(method: string, url: string, data: unknown): Promise<T> {
    return getJson<T>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
const postJson = <T,>(url: string, data: unknown) => sendJson<T>('POST', url, data);
const patchJson = <T,>(url: string, data: unknown) => sendJson<T>('PATCH', url, data);

// cookies

// GET /api/cookies with filters (FR01)
export function getCookies(filters: { search?: string; type?: string; rarity?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.rarity) params.set('rarity', filters.rarity);
    const qs = params.toString();
    return getJson<Cookie[]>('/api/cookies' + (qs ? '?' + qs : ''));
}

// counter lookup

// POST /api/lookup - counter search (FR03/FR04)
export function lookupCounters(enemyTeam: string[], enemyGear: GearSetup) {
    return postJson<LookupResult>('/api/lookup', { enemyTeam, enemyGear });
}

// community builds

// GET /api/builds, sorted (FR08)
export type BuildSort = 'likes' | 'views' | 'newest' | 'featured';
export function getBuilds(sort: BuildSort = 'likes') {
    return getJson<PlayerBuild[]>(`/api/builds?sort=${sort}`);
}
// old name, still used in places
export const getTopBuilds = () => getBuilds('likes');

// POST /api/builds/:id/view - count a view
export function countBuildView(buildId: number) {
    return postJson<{ views: number }>(`/api/builds/${buildId}/view`, {});
}

// POST /api/builds - submit a build (FR05)
export function submitBuild(build: {
    opponentTeam: string[];
    counterTeam: string[];
    gearSetup: unknown;
    note: string;
}) {
    return postJson<PlayerBuild>('/api/builds', build);
}

// POST /api/builds/:id/like - like or unlike (FR06/07)
export function likeBuild(buildId: number) {
    return postJson<{ likes: number; likedByMe: boolean }>(`/api/builds/${buildId}/like`, {});
}

// auth

export function signup(data: { username: string; email: string; password: string }) {
    return postJson<{ token: string; user: AuthUser }>('/api/auth/signup', data);
}
export function login(data: { email: string; password: string }) {
    return postJson<{ token: string; user: AuthUser }>('/api/auth/login', data);
}
export function getMe() {
    return getJson<{ user: AuthUser }>('/api/auth/me');
}

// profiles

// PATCH /api/auth/me - change username or picture
export function updateProfile(changes: {
    username?: string;
    avatar?: string | null;
    avatarData?: string | null;
}) {
    return patchJson<{ token: string; user: AuthUser }>('/api/auth/me', changes);
}

// GET /api/users/:id - a profile and their builds
export function getProfile(userId: number | string) {
    return getJson<{ profile: Profile; builds: PlayerBuild[] }>(
        '/api/users/' + encodeURIComponent(String(userId)));
}

// PATCH /api/builds/:id - show or hide a build
export function setBuildPrivacy(buildId: number, isPublic: boolean) {
    return patchJson<{ build_id: number; is_public: boolean }>(
        `/api/builds/${buildId}`, { isPublic });
}

// DELETE /api/builds/:id - delete your build
export function deleteBuild(buildId: number) {
    return getJson<{ deleted: number }>(`/api/builds/${buildId}`, { method: 'DELETE' });
}

// following

// POST /api/follows/:id - follow or unfollow
export function toggleFollow(userId: number) {
    return postJson<{ username: string; following: boolean; followers: number }>(
        '/api/follows/' + userId, {});
}

// GET /api/follows/:id/followers
export function getFollowers(userId: number) {
    return getJson<{ username: string; users: FollowUser[] }>(
        `/api/follows/${userId}/followers`);
}

// GET /api/follows/:id/following
export function getFollowing(userId: number) {
    return getJson<{ username: string; users: FollowUser[] }>(
        `/api/follows/${userId}/following`);
}

// staff actions, all re-checked on the server

// GET /api/users - all accounts
export function getAllUsers() {
    return getJson<StaffUser[]>('/api/users');
}

// GET /api/users/lookup - find an account
export function lookupUser(q: string) {
    return getJson<StaffUser>('/api/users/lookup?q=' + encodeURIComponent(q));
}

// POST /api/users/:id/titles - award a title
export function addUserTitle(userId: number, name: string, color: string) {
    return postJson<{ userId: number; titles: Title[] }>(
        `/api/users/${userId}/titles`, { name, color });
}

// DELETE /api/users/:id/titles/:name
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

// IP bans
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

// GET /api/users/me/likes - my liked builds
export function getLikedBuilds() {
    return getJson<PlayerBuild[]>('/api/users/me/likes');
}

// themes

export interface SavedTheme { theme_id: number; name: string; theme: unknown; }

// PUT /api/auth/me/theme - save current theme
export function saveMyTheme(theme: unknown) {
    return sendJson<{ saved: boolean }>('PUT', '/api/auth/me/theme', { theme });
}

// GET /api/auth/me/themes - saved presets
export function getMyThemes() {
    return getJson<SavedTheme[]>('/api/auth/me/themes');
}

// POST /api/auth/me/themes - save under a name
export function saveThemePreset(name: string, theme: unknown) {
    return postJson<SavedTheme>('/api/auth/me/themes', { name, theme });
}

// DELETE /api/auth/me/themes/:id
export function deleteThemePreset(themeId: number) {
    return getJson<{ deleted: number }>(`/api/auth/me/themes/${themeId}`, { method: 'DELETE' });
}

// picture helpers

// url for a cookie portrait
export function cookieImageUrl(imageFile: string) {
    return API_BASE + '/images/cookies/' + imageFile;
}

// pick a profile picture: upload, then portrait, then none
export function avatarUrl(
    who: { avatar?: string | null; avatarData?: string | null;
           avatar_data?: string | null } | null | undefined
): string | null {
    if (!who) return null;
    const uploaded = who.avatarData ?? who.avatar_data;
    if (uploaded) return uploaded;                       // already a data URI
    if (who.avatar) return cookieImageUrl(who.avatar);
    return null;
}
