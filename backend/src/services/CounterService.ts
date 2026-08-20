// the counter lookup algorithm (SRS 6.7)

import { query } from '../db';

// cookie name -> gear type
export type GearSetup = Record<string, string>;

// a meta team from the database
export interface MetaTeam {
    meta_team_id: number;
    team_name: string;
    team_cookies: string[];
    gear_setup: GearSetup | null;
    counters: string[];
    win_rate: number;
    matched?: number;    // cookies it covers
    searched?: number;
    exact?: boolean;
}

// a community build
export interface PlayerBuild {
    build_id: number;
    username: string;
    opponent_team: string[];
    counter_team: string[];
    gear_setup: GearSetup | null;
    note: string | null;
    likes: number;
    score?: number;         // only set when searching with gear
    matched?: number;       // enemy cookies covered
    searched?: number;      // cookies searched for
    exact?: boolean;        // covers the whole enemy team
    anyTeam?: boolean;      // a general-purpose build
}

// what the lookup returns
export interface LookupResult {
    metaTeams: MetaTeam[];
    playerTeams: PlayerBuild[];
}

// points per matching gear piece
const GEAR_MATCH_BONUS = 5;

export class CounterService {

    // the main algorithm
    async lookupCounters(enemyTeam: string[], enemyGear: GearSetup = {}): Promise<LookupResult> {

        // step 1: reject an empty team
        if (!enemyTeam || enemyTeam.length === 0) {
            throw new Error('enemyTeam must contain at least one cookie');
        }

        // step 2: meta teams countering any enemy cookie, best overlap first.
        // && means the arrays share at least one item
        const metaResult = await query(
            `SELECT meta_team_id, team_name, team_cookies, gear_setup, counters, win_rate,
                    -- how many searched cookies it counters
                    cardinality(ARRAY(SELECT UNNEST(counters) INTERSECT SELECT UNNEST($1::text[]))) AS matched
             FROM meta_teams
             WHERE counters && $1
             ORDER BY matched DESC, win_rate DESC
             LIMIT 8`,
            [enemyTeam]
        );

        // step 3: community builds, matching or general-purpose ones
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
            // exact = made against this exact team
            exact: Number(row.matched ?? 0) === enemyTeam.length
                && row.opponent_team?.length === enemyTeam.length,
            anyTeam: row.any_team === true,
        }));

        // step 4: boost builds whose gear matches
        if (Object.keys(enemyGear).length > 0) {
            playerTeams = this.applyGearBonus(playerTeams, enemyGear);
        }

        const metaTeams = metaResult.rows.map(row => ({
            ...row,
            matched: Number(row.matched ?? 0),
            searched: enemyTeam.length,
            exact: Number(row.matched ?? 0) === enemyTeam.length,
        }));

        // step 5: return both lists
        return { metaTeams, playerTeams };
    }

    // score = likes + matching gear pieces * 5
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

        // sort by cookies covered, then use the score as a tiebreak
        return [...teams].sort((a, b) =>
            (b.matched ?? 0) - (a.matched ?? 0)
            || (b.score ?? 0) - (a.score ?? 0));
    }
}

// the shared instance routes use
export const counterService = new CounterService();
