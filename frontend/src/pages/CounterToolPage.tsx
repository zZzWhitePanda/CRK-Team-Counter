// ============================================================
// CounterToolPage.tsx - the main feature (UC01).
//
// The user builds the ENEMY team here and hits Find Counters.
// Because you can't see an opponent's toppings/beascuit in-game,
// the enemy side only lets you set what you CAN see: each cookie's
// level and ascension, plus the team's 3 treasures. Full build
// customisation (toppings, tarts, beascuits) lives in the
// Community Builds submit form, where you describe your own team.
//
// Results come back in two lists: meta teams by win rate, and
// community builds by likes (FR03/FR04).
// ============================================================

import { useEffect, useState } from 'react';
import { Target, Heart, Swords, Gem, Settings2 } from 'lucide-react';
import { Cookie, getCookies, lookupCounters, LookupResult } from '../api';
import { TeamRow } from '../components/TeamRow';
import { CookiePicker } from '../components/CookiePicker';
import { EnemyCookieEditor } from '../components/EnemyCookieEditor';
import { TreasureSelector } from '../components/TreasureSelector';
import { EnemyInfo, emptyEnemyInfo, TeamTreasures, emptyTreasures } from '../gear';

export function CounterToolPage() {
    const [roster, setRoster] = useState<Cookie[]>([]);

    // the enemy team: 5 cookie slots + what we can see of each cookie
    const [enemyTeam, setEnemyTeam] = useState<string[]>(['', '', '', '', '']);
    const [enemyInfo, setEnemyInfo] = useState<EnemyInfo[]>(
        () => Array.from({ length: 5 }, emptyEnemyInfo));
    const [enemyTreasures, setEnemyTreasures] = useState<TeamTreasures>(emptyTreasures);
    const [editingEnemy, setEditingEnemy] = useState<number | null>(null);

    const [results, setResults] = useState<LookupResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // load the roster once to fill the picker
    useEffect(() => {
        getCookies().then(setRoster).catch(err => setError(err.message));
    }, []);

    function setSlot(index: number, name: string) {
        setEnemyTeam(prev => prev.map((n, i) => i === index ? name : n));
        if (name === '') {  // clearing a slot resets its info
            setEnemyInfo(prev => prev.map((info, i) => i === index ? emptyEnemyInfo() : info));
        }
    }
    function setInfo(index: number, info: EnemyInfo) {
        setEnemyInfo(prev => prev.map((v, i) => i === index ? info : v));
    }

    async function runSearch() {
        // FR09: check on the browser side first so an empty search
        // never wastes a trip to the server (it checks again anyway)
        const picked = enemyTeam.filter(name => name !== '');
        if (picked.length === 0) {
            setError('Please pick at least one enemy cookie.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // the lookup matches on the enemy team's cookies; the
            // level/ascension/treasures are extra context the user
            // records but don't change which teams counter this comp.
            setResults(await lookupCounters(picked, {}));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed.');
            setResults(null);
        } finally {
            setLoading(false);
        }
    }

    const pickedNames = enemyTeam.filter(n => n !== '');
    const nothingFound =
        results !== null &&
        results.metaTeams.length === 0 &&
        results.playerTeams.length === 0;

    return (
        <div>
            <h1>Counter Tool</h1>
            <p className="muted" style={{ margin: '8px 0 24px' }}>
                Drop in the opponent's roster, get counter teams that win the matchup.
            </p>

            {/* ---- enemy team card ---- */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h2 className="section-title" style={{ fontSize: 18 }}>
                    <Target size={20} color="var(--color-enemy)" aria-hidden="true" />
                    OPPONENT'S TEAM
                </h2>

                <div className="picker-row">
                    {enemyTeam.map((name, i) => {
                        const cookie = roster.find(c => c.name === name);
                        return (
                            <div key={i} className="picker-cell">
                                <CookiePicker
                                    roster={roster}
                                    selectedName={name}
                                    disabledNames={pickedNames}
                                    onPick={n => setSlot(i, n)}
                                    onClear={() => setSlot(i, '')}
                                />
                                {/* once picked, a small Info button for level + ascension */}
                                {cookie && (
                                    <button className="pill info-button" onClick={() => setEditingEnemy(i)}>
                                        <Settings2 size={14} aria-hidden="true" />
                                        Lv.{enemyInfo[i].level}{enemyInfo[i].ascension > 0 ? ` · ${enemyInfo[i].ascension}A` : ''}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* enemy team treasures (3 slots) */}
                <h3 className="section-title" style={{ fontSize: 15, marginTop: 24 }}>
                    <Gem size={16} color="var(--color-enemy)" aria-hidden="true" /> Treasures
                </h3>
                <TreasureSelector treasures={enemyTreasures} onChange={setEnemyTreasures} />

                {error && <div className="error-box" role="alert" style={{ marginTop: 16 }}>{error}</div>}

                <button className="btn-primary" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={runSearch} disabled={loading}>
                    <Swords size={18} aria-hidden="true" />
                    {loading ? 'Searching…' : 'Find Counters'}
                </button>
            </div>

            {/* the enemy info popup (level + ascension only) */}
            {editingEnemy !== null && roster.find(c => c.name === enemyTeam[editingEnemy]) && (
                <EnemyCookieEditor
                    cookie={roster.find(c => c.name === enemyTeam[editingEnemy])!}
                    info={enemyInfo[editingEnemy]}
                    onChange={info => setInfo(editingEnemy, info)}
                    onClose={() => setEditingEnemy(null)}
                />
            )}

            {/* ---- loading skeletons ---- */}
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 130 }} />)}
                </div>
            )}

            {/* ---- FR10: no matches message ---- */}
            {!loading && nothingFound && (
                <div className="card">
                    <p>No saved counters for that team yet — be the first to add one on Community Builds!</p>
                </div>
            )}

            {/* ---- meta teams, by win rate (FR03) ---- */}
            {!loading && results && results.metaTeams.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                    <h2 style={{ marginBottom: 12 }}>Meta Counters</h2>
                    {results.metaTeams.map(team => (
                        <div key={team.meta_team_id} className="card card-interactive" style={{ marginBottom: 12 }}>
                            <div className="build-head">
                                <h3>{team.team_name}</h3>
                                <span className="winrate-badge">{Number(team.win_rate).toFixed(0)}% win rate</span>
                            </div>
                            <TeamRow label="USE" kind="ally" cookieNames={team.team_cookies} allCookies={roster} />
                        </div>
                    ))}
                </section>
            )}

            {/* ---- community builds, by likes (FR04) ---- */}
            {!loading && results && results.playerTeams.length > 0 && (
                <section>
                    <h2 style={{ marginBottom: 12 }}>Community Counters</h2>
                    {results.playerTeams.map(build => (
                        <div key={build.build_id} className="card card-interactive" style={{ marginBottom: 12 }}>
                            <div className="build-head">
                                <span className="muted">by {build.username}</span>
                                <span className="like-count"><Heart size={16} aria-hidden="true" /> {build.likes}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <TeamRow label="VS." kind="enemy" cookieNames={build.opponent_team} allCookies={roster} />
                                <TeamRow label="USE" kind="ally" cookieNames={build.counter_team} allCookies={roster} />
                            </div>
                            {build.note && <p style={{ marginTop: 12 }}>{build.note}</p>}
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
