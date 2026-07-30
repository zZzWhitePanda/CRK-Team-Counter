// ============================================================
// CounterToolPage.tsx - the main feature (UC01).
//
// The user builds the enemy team using the visual CookiePicker
// (up to 5 cookies, FR01), optionally sets the gear each one is
// using (FR02), and hits Find Counters. Results come back in two
// lists: meta teams by win rate, community builds by likes
// (FR03/FR04).
// ============================================================

import { useEffect, useState } from 'react';
import { Target, Heart, Swords, Shield, Settings2 } from 'lucide-react';
import { Cookie, getCookies, lookupCounters, LookupResult, GearSetup } from '../api';
import { TeamRow } from '../components/TeamRow';
import { CookiePicker } from '../components/CookiePicker';
import { CookieBuildEditor } from '../components/CookieBuildEditor';
import { CookieBuild, emptyBuild } from '../gear';

// gear/topping options for the optional gear drop-downs
const GEAR_OPTIONS = [
    'Searing Raspberry', 'Swift Chocolate', 'Solid Almond', 'Juicy Apple Jelly',
    'Bouncy Caramel', 'Healthy Peanut', 'Hard Walnut', 'Fresh Kiwi', 'Sweet Candy',
];

export function CounterToolPage() {
    const [roster, setRoster] = useState<Cookie[]>([]);

    // 5 slots; '' = empty slot. Gear matches by slot position.
    const [enemyTeam, setEnemyTeam] = useState<string[]>(['', '', '', '', '']);
    const [enemyGear, setEnemyGear] = useState<string[]>(['', '', '', '', '']);

    const [results, setResults] = useState<LookupResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ---- YOUR team (with full build customisation) ----
    // Unlike the enemy, you know your own toppings/beascuit/etc, so
    // each of your cookies gets a full build. Kept in slot order.
    const [yourTeam, setYourTeam] = useState<string[]>(['', '', '', '', '']);
    const [yourBuilds, setYourBuilds] = useState<CookieBuild[]>(
        () => Array.from({ length: 5 }, emptyBuild));
    const [editingSlot, setEditingSlot] = useState<number | null>(null);

    function setYourSlot(index: number, name: string) {
        setYourTeam(prev => prev.map((n, i) => i === index ? name : n));
        // clearing a slot also clears its build
        if (name === '') {
            setYourBuilds(prev => prev.map((b, i) => i === index ? emptyBuild() : b));
        }
    }
    function setYourBuild(index: number, build: CookieBuild) {
        setYourBuilds(prev => prev.map((b, i) => i === index ? build : b));
    }

    // load the roster once to fill the picker
    useEffect(() => {
        getCookies().then(setRoster).catch(err => setError(err.message));
    }, []);

    function setSlot(index: number, name: string) {
        const next = [...enemyTeam];
        next[index] = name;
        setEnemyTeam(next);
    }
    function setGearSlot(index: number, gear: string) {
        const next = [...enemyGear];
        next[index] = gear;
        setEnemyGear(next);
    }

    async function runSearch() {
        // FR09: client-side check first so an empty search never
        // wastes a trip to the server (it checks again anyway)
        const picked = enemyTeam.filter(name => name !== '');
        if (picked.length === 0) {
            setError('Please pick at least one enemy cookie.');
            return;
        }

        // build { cookieName: gear } from the two slot arrays
        const gear: GearSetup = {};
        enemyTeam.forEach((name, i) => {
            if (name !== '' && enemyGear[i] !== '') gear[name] = enemyGear[i];
        });

        setLoading(true);
        setError('');
        try {
            setResults(await lookupCounters(picked, gear));
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

            {/* ---- enemy team picker card ---- */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h2 className="section-title" style={{ fontSize: 18 }}>
                    <Target size={20} color="var(--color-enemy)" aria-hidden="true" />
                    OPPONENT'S TEAM
                </h2>

                <div className="picker-row">
                    {enemyTeam.map((name, i) => (
                        <div key={i} className="picker-cell">
                            <CookiePicker
                                roster={roster}
                                selectedName={name}
                                disabledNames={pickedNames}
                                onPick={n => setSlot(i, n)}
                                onClear={() => { setSlot(i, ''); setGearSlot(i, ''); }}
                            />
                            {/* gear only appears once a cookie is picked (FR02, optional) */}
                            {name !== '' && (
                                <select
                                    className="input gear-select"
                                    aria-label={`Gear for ${name}`}
                                    value={enemyGear[i]}
                                    onChange={e => setGearSlot(i, e.target.value)}
                                >
                                    <option value="">Gear? (optional)</option>
                                    {GEAR_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            )}
                        </div>
                    ))}
                </div>

                {error && <div className="error-box" role="alert" style={{ marginTop: 16 }}>{error}</div>}

                <button className="btn-primary" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={runSearch} disabled={loading}>
                    <Swords size={18} aria-hidden="true" />
                    {loading ? 'Searching…' : 'Find Counters'}
                </button>
            </div>

            {/* ---- YOUR team, with build customisation ---- */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h2 className="section-title" style={{ fontSize: 18 }}>
                    <Shield size={20} color="var(--color-ally)" aria-hidden="true" />
                    YOUR TEAM
                </h2>
                <p className="muted" style={{ fontSize: 14, marginTop: -8, marginBottom: 16 }}>
                    Pick your cookies and set each one's toppings, beascuit, ascension and level.
                </p>

                <div className="picker-row">
                    {yourTeam.map((name, i) => {
                        const cookie = roster.find(c => c.name === name);
                        return (
                            <div key={i} className="picker-cell">
                                <CookiePicker
                                    roster={roster}
                                    selectedName={name}
                                    disabledNames={yourTeam.filter(n => n)}
                                    onPick={n => setYourSlot(i, n)}
                                    onClear={() => setYourSlot(i, '')}
                                />
                                {/* once a cookie is picked, a Build button opens its editor */}
                                {cookie && (
                                    <button className="pill build-button" onClick={() => setEditingSlot(i)}>
                                        <Settings2 size={14} aria-hidden="true" /> Build
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* the build editor popup for the chosen your-team cookie */}
            {editingSlot !== null && roster.find(c => c.name === yourTeam[editingSlot]) && (
                <CookieBuildEditor
                    cookie={roster.find(c => c.name === yourTeam[editingSlot])!}
                    build={yourBuilds[editingSlot]}
                    onChange={b => setYourBuild(editingSlot, b)}
                    onClose={() => setEditingSlot(null)}
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
