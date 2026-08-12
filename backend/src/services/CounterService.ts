// ============================================================
// CounterService.ts - the main algorithm of the whole website.
//
// This is the counter lookup from my SRS (section 6.7) turned
// into a TypeScript class. The class wraps everything to do
// with finding counter teams in one place, so the route file
// just calls counterService.lookupCounters(...) and doesn't
// need to know how the search works inside.
// ============================================================

import { query } from '../db';

// ---- Types: the shapes of the data moving through the lookup ----

// gear is a lookup of cookie name -> gear type,
// e.g. { "Shadow Milk Cookie": "Swift Chocolate" }
export type GearSetup = Record<string, string>;

// a meta team row as it comes back from the database
export interface MetaTeam {
    meta_team_id: number;
    team_name: string;
    team_cookies: string[];
    gear_setup: GearSetup | null;
    counters: string[];
    win_rate: number;
    matched?: number;    // how many of the searched cookies it covers
    searched?: number;
    exact?: boolean;
}

// a community build row (joined with the username of who made it)
export interface PlayerBuild {
    build_id: number;
    username: string;
    opponent_team: string[];
    counter_team: string[];
    gear_setup: GearSetup | null;
    note: string | null;
    likes: number;
    score?: number;         // only set when the user searched with gear
    matched?: number;       // how many of the enemy cookies this build covers
    searched?: number;      // how many the user searched for
    exact?: boolean;        // true when it covers the whole enemy team
    anyTeam?: boolean;      // true when it's a general-purpose build
}

// what the lookup hands back to the route
export interface LookupResult {
    metaTeams: MetaTeam[];
    playerTeams: PlayerBuild[];
}

// how many points one matching gear piece is worth when boosting
// player teams (from the SRS pseudocode: likes + matches * 5)
const GEAR_MATCH_BONUS = 5;

export class CounterService {

    // ----------------------------------------------------------
    // The main algorithm (SRS 6.7 pseudocode, step by step)
    // ----------------------------------------------------------
    async lookupCounters(enemyTeam: string[], enemyGear: GearSetup = {}): Promise<LookupResult> {

        // STEP 1: empty enemy team is the caller's job to reject
        // before calling this (the route checks it, see lookup.ts).
        // It is checked again here as a safety net.
        if (!enemyTeam || enemyTeam.length === 0) {
            throw new Error('enemyTeam must contain at least one cookie');
        }

        // STEP 2: meta teams that counter ANY of the enemy cookies.
        //
        // The original version used `counters @> $1`, which only
        // matched a team that beats EVERY cookie searched for. That
        // is far too strict in practice: swap one cookie out of a
        // five-cookie team and you got nothing back at all. The
        // overlap version below finds teams that share at least one
        // cookie and then RANKS them by how much they overlap, so a
        // near-miss still shows up (just lower down).
        //
        // && is Postgres's "arrays overlap" operator - true when the
        // two arrays share at least one element. It uses the same
        // GIN index as @>, so this stays fast.
        const metaResult = await query(
            `SELECT meta_team_id, team_name, team_cookies, gear_setup, counters, win_rate,
                    -- how many of the searched cookies this team counters
                    cardinality(ARRAY(SELECT UNNEST(counters) INTERSECT SELECT UNNEST($1::text[]))) AS matched
             FROM meta_teams
             WHERE counters && $1
             ORDER BY matched DESC, win_rate DESC
             LIMIT 8`,
            [enemyTeam]
        );

        // STEP 3: community builds. Two kinds are useful here:
        //   * builds saved against an overlapping enemy team
        //   * "works against anything" builds, saved with NO enemy
        //     team at all - those are always relevant
        const playerResult = await query(
            `SELECT b.build_id, b.user_id, u.username, u.avatar, u.avatar_data, u.titles,
                    b.opponent_team, b.counter_team,
                    b.gear_setup, b.note, b.likes, b.views,
                    cardinality(ARRAY(SELECT UNNEST(b.opponent_team) INTERSECT SELECT UNNEST($1::text[]))) AS matched,
                    (b.opponent_team IS NULL OR cardinality(b.opponent_team) = 0) AS any_team
             FROM user_builds b
             JOIN users u ON u.user_id = b.user_id
             WHERE b.is_public = TRUE
               AND (u.banned_at IS NULL
                    OR (u.banned_until IS NOT NULL AND u.banned_until <= NOW()))
               AND (b.opponent_team && $1
                    OR b.opponent_team IS NULL
                    OR cardinality(b.opponent_team) = 0)
             ORDER BY matched DESC, b.likes DESC, b.created_at DESC
             LIMIT 12`,
            [enemyTeam]
        );

        let playerTeams: PlayerBuild[] = playerResult.rows.map(row => ({
            ...row,
            matched: Number(row.matched ?? 0),
            searched: enemyTeam.length,
            // "exact" = this build was made against precisely the
            // team being searched for, so the UI can badge it
            exact: Number(row.matched ?? 0) === enemyTeam.length
                && row.opponent_team?.length === enemyTeam.length,
            anyTeam: row.any_team === true,
        }));

        // STEP 4: if the user told us the enemy's gear, boost the
        // player teams whose saved gear matches it, then re-sort.
        if (Object.keys(enemyGear).length > 0) {
            playerTeams = this.applyGearBonus(playerTeams, enemyGear);
        }

        const metaTeams = metaResult.rows.map(row => ({
            ...row,
            matched: Number(row.matched ?? 0),
            searched: enemyTeam.length,
            exact: Number(row.matched ?? 0) === enemyTeam.length,
        }));

        // STEP 5: hand both lists back
        return { metaTeams, playerTeams };
    }

    // ----------------------------------------------------------
    // Gear bonus (private = only this class can use it).
    // For each player team, count how many of the enemy's gear
    // picks its saved gear_setup also has, then score the team
    // as likes + matches * 5 and sort by that score.
    // ----------------------------------------------------------
    private applyGearBonus(teams: PlayerBuild[], enemyGear: GearSetup): PlayerBuild[] {

        for (const team of teams) {
            let matches = 0;

            for (const [cookie, gear] of Object.entries(enemyGear)) {
                if (team.gear_setup && team.gear_setup[cookie] === gear) {
                    matches = matches + 1;
                }
            }

            team.score = team.likes + matches * GEAR_MATCH_BONUS;
        }

        // Sort by how many enemy cookies the build actually covers
        // FIRST, and only use the gear score to break ties. Without
        // that, a wildly popular build for a different team could
        // outrank the one that actually matches what was searched.
        return [...teams].sort((a, b) =>
            (b.matched ?? 0) - (a.matched ?? 0)
            || (b.score ?? 0) - (a.score ?? 0));
    }
}

// one shared instance the routes can import
export const counterService = new CounterService();
