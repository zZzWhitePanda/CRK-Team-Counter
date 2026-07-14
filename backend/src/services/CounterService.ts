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
    score?: number; // only set when the user searched with gear
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

        // STEP 2: meta teams whose "counters" list CONTAINS the
        // enemy team. @> is Postgres's "contains" check on arrays -
        // it ignores order, which is exactly what the SRS needs
        // (the enemy team can be picked in any order). Sorted by
        // win rate, best first, top 5.
        const metaResult = await query(
            `SELECT meta_team_id, team_name, team_cookies, gear_setup, counters, win_rate
             FROM meta_teams
             WHERE counters @> $1
             ORDER BY win_rate DESC
             LIMIT 5`,
            [enemyTeam]
        );

        // STEP 3: community builds saved against the same enemy
        // team, sorted by likes, top 5. Joined with users so the
        // site can show who made each build.
        const playerResult = await query(
            `SELECT b.build_id, u.username, b.opponent_team, b.counter_team,
                    b.gear_setup, b.note, b.likes
             FROM user_builds b
             JOIN users u ON u.user_id = b.user_id
             WHERE b.opponent_team @> $1
             ORDER BY b.likes DESC, b.created_at DESC
             LIMIT 5`,
            [enemyTeam]
        );

        let playerTeams: PlayerBuild[] = playerResult.rows;

        // STEP 4: if the user told us the enemy's gear, boost the
        // player teams whose saved gear matches it, then re-sort.
        if (Object.keys(enemyGear).length > 0) {
            playerTeams = this.applyGearBonus(playerTeams, enemyGear);
        }

        // STEP 5: hand both lists back
        return { metaTeams: metaResult.rows, playerTeams };
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

        // sort by score, highest first (b - a = descending)
        return [...teams].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
}

// one shared instance the routes can import
export const counterService = new CounterService();
