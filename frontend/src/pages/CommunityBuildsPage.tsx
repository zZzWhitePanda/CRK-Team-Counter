// ============================================================
// CommunityBuildsPage.tsx - the most-liked community builds
// (FR08), plus (when logged in) a form to submit your own build
// (FR05) and like buttons on every build (FR06/FR07).
// ============================================================

import { useEffect, useState } from 'react';
import { Trophy, Plus, Heart, Settings2, Gem } from 'lucide-react';
import { Cookie, PlayerBuild, getCookies, getTopBuilds, likeBuild, submitBuild } from '../api';
import { TeamRow } from '../components/TeamRow';
import { CookiePicker } from '../components/CookiePicker';
import { CookieBuildEditor } from '../components/CookieBuildEditor';
import { EnemyCookieEditor } from '../components/EnemyCookieEditor';
import { TreasureSelector } from '../components/TreasureSelector';
import { AuthModal } from '../components/AuthModal';
import {
    CookieBuild, emptyBuild, EnemyInfo, emptyEnemyInfo,
    TeamTreasures, emptyTreasures,
} from '../gear';
import { useAuth } from '../auth';

export function CommunityBuildsPage() {
    const { user } = useAuth();
    const [builds, setBuilds] = useState<PlayerBuild[]>([]);
    const [roster, setRoster] = useState<Cookie[]>([]);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [showForm, setShowForm] = useState(false);

    function load() {
        Promise.all([getTopBuilds(), getCookies()])
            .then(([topBuilds, cookies]) => { setBuilds(topBuilds); setRoster(cookies); })
            .catch(err => setError(err.message))
            .finally(() => setLoaded(true));
    }
    // reload builds when login state changes (to get likedByMe)
    useEffect(load, [user]);

    // ---- liking (FR06/FR07) ----
    async function handleLike(buildId: number) {
        if (!user) { setShowAuth(true); return; }   // must be logged in
        try {
            const res = await likeBuild(buildId);
            setBuilds(prev => prev.map(b =>
                b.build_id === buildId ? { ...b, likes: res.likes, likedByMe: res.likedByMe } : b));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not like that.');
        }
    }

    return (
        <div>
            <h1 style={{ marginBottom: 16 }}>Community Builds</h1>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                <button className="pill active" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={16} aria-hidden="true" /> Top
                </button>
                <button
                    className="pill"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => user ? setShowForm(v => !v) : setShowAuth(true)}
                >
                    <Plus size={16} aria-hidden="true" />
                    {user ? (showForm ? 'Close form' : 'Submit a build') : 'Log in to submit'}
                </button>
            </div>

            {/* ---- submit form (logged-in only) ---- */}
            {user && showForm && (
                <SubmitForm
                    roster={roster}
                    onSubmitted={newBuild => {
                        setBuilds(prev => [newBuild, ...prev]);
                        setShowForm(false);
                    }}
                />
            )}

            {error && <div className="error-box" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

            {/* loading skeletons */}
            {!loaded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
                </div>
            )}

            {/* empty state */}
            {loaded && !error && builds.length === 0 && (
                <div className="card">
                    <p>No community builds yet — {user ? 'be the first to submit one above!' : 'log in and be the first to submit one!'}</p>
                </div>
            )}

            {/* the build list */}
            {builds.map((build, index) => (
                <div key={build.build_id} className="card card-interactive" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className="rank-badge">#{index + 1}</span>
                        <h3 style={{ flex: 1 }}>{build.counter_team[0]} Comp</h3>
                        <button
                            className={'like-button' + (build.likedByMe ? ' liked' : '')}
                            onClick={() => handleLike(build.build_id)}
                            title={user ? (build.likedByMe ? 'Unlike' : 'Like') : 'Log in to like'}
                        >
                            <Heart size={18} fill={build.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
                            {build.likes}
                        </button>
                    </div>

                    <p className="muted" style={{ marginBottom: 12 }}>by {build.username}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <TeamRow label="VS." kind="enemy" cookieNames={build.opponent_team} allCookies={roster} />
                        <TeamRow label="USE" kind="ally" cookieNames={build.counter_team} allCookies={roster} />
                    </div>

                    {build.note && <p style={{ marginTop: 12 }}>{build.note}</p>}
                </div>
            ))}

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    );
}

// ---- the submit-a-build form (its own component to keep state tidy) ----
// This is where a full build is made: your counter team gets the full
// customisation (toppings, tart, beascuit, ascension, level), the enemy
// team gets what you can see (level + ascension), and each team has its
// 3 treasures.
function SubmitForm({ roster, onSubmitted }: { roster: Cookie[]; onSubmitted: (b: PlayerBuild) => void }) {
    // enemy side: cookie names + what you can see of each + treasures
    const [opponent, setOpponent] = useState<string[]>(['', '', '', '', '']);
    const [opponentInfo, setOpponentInfo] = useState<EnemyInfo[]>(() => Array.from({ length: 5 }, emptyEnemyInfo));
    const [enemyTreasures, setEnemyTreasures] = useState<TeamTreasures>(emptyTreasures);

    // your side: cookie names + full builds + treasures
    const [counter, setCounter] = useState<string[]>(['', '', '', '', '']);
    const [counterBuilds, setCounterBuilds] = useState<CookieBuild[]>(() => Array.from({ length: 5 }, emptyBuild));
    const [yourTreasures, setYourTreasures] = useState<TeamTreasures>(emptyTreasures);

    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // which editor popup is open, if any
    const [editEnemy, setEditEnemy] = useState<number | null>(null);
    const [editMine, setEditMine] = useState<number | null>(null);

    async function handleSubmit() {
        const opp = opponent.filter(n => n);
        const cnt = counter.filter(n => n);
        if (opp.length === 0) { setError('Pick at least one enemy cookie.'); return; }
        if (cnt.length === 0) { setError('Pick at least one cookie for your counter team.'); return; }

        // The full build details (toppings/beascuit/treasures/etc) are
        // saved in the build's gearSetup field so nothing is lost.
        // Only the cookies for slots that are actually filled are kept.
        const details = {
            enemyInfo: opponent.map((n, i) => n ? { cookie: n, ...opponentInfo[i] } : null).filter(Boolean),
            enemyTreasures: enemyTreasures.filter(Boolean),
            yourBuilds: counter.map((n, i) => n ? { cookie: n, ...counterBuilds[i] } : null).filter(Boolean),
            yourTreasures: yourTreasures.filter(Boolean),
        };

        setBusy(true); setError('');
        try {
            const build = await submitBuild({ opponentTeam: opp, counterTeam: cnt, gearSetup: details, note });
            onSubmitted(build);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not submit.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--color-primary)' }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Submit a counter build</h2>

            {/* ---- enemy team (level + ascension only) ---- */}
            <p className="field-label" style={{ color: 'var(--color-enemy)' }}>Enemy team you're countering</p>
            <div className="picker-row" style={{ marginBottom: 12 }}>
                {opponent.map((name, i) => {
                    const cookie = roster.find(c => c.name === name);
                    return (
                        <div key={i} className="picker-cell">
                            <CookiePicker roster={roster} selectedName={name}
                                disabledNames={opponent.filter(n => n)}
                                onPick={n => setOpponent(prev => prev.map((v, idx) => idx === i ? n : v))}
                                onClear={() => setOpponent(prev => prev.map((v, idx) => idx === i ? '' : v))} />
                            {cookie && (
                                <button className="pill info-button" onClick={() => setEditEnemy(i)}>
                                    <Settings2 size={14} aria-hidden="true" />
                                    Lv.{opponentInfo[i].level}{opponentInfo[i].ascension > 0 ? ` · ${opponentInfo[i].ascension}A` : ''}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            <h4 className="section-title" style={{ fontSize: 13, margin: '0 0 6px' }}>
                <Gem size={14} color="var(--color-enemy)" aria-hidden="true" /> Enemy treasures
            </h4>
            <TreasureSelector treasures={enemyTreasures} onChange={setEnemyTreasures} />

            {/* ---- your counter team (full build) ---- */}
            <p className="field-label" style={{ color: 'var(--color-ally)', marginTop: 24 }}>Your counter team</p>
            <div className="picker-row" style={{ marginBottom: 12 }}>
                {counter.map((name, i) => {
                    const cookie = roster.find(c => c.name === name);
                    return (
                        <div key={i} className="picker-cell">
                            <CookiePicker roster={roster} selectedName={name}
                                disabledNames={counter.filter(n => n)}
                                onPick={n => setCounter(prev => prev.map((v, idx) => idx === i ? n : v))}
                                onClear={() => {
                                    setCounter(prev => prev.map((v, idx) => idx === i ? '' : v));
                                    setCounterBuilds(prev => prev.map((b, idx) => idx === i ? emptyBuild() : b));
                                }} />
                            {cookie && (
                                <button className="pill build-button" onClick={() => setEditMine(i)}>
                                    <Settings2 size={14} aria-hidden="true" /> Build
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            <h4 className="section-title" style={{ fontSize: 13, margin: '0 0 6px' }}>
                <Gem size={14} color="var(--color-ally)" aria-hidden="true" /> Your treasures
            </h4>
            <TreasureSelector treasures={yourTreasures} onChange={setYourTreasures} />

            {/* ---- note ---- */}
            <label htmlFor="build-note" className="field-label" style={{ marginTop: 24 }}>Note (how it works — optional, max 1000)</label>
            <textarea
                id="build-note"
                className="input"
                style={{ minHeight: 80, resize: 'vertical', fontFamily: 'var(--font-body)' }}
                maxLength={1000}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Burst the healers down before their revive comes online."
            />

            {error && <div className="error-box" role="alert" style={{ marginTop: 12 }}>{error}</div>}

            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={busy}>
                {busy ? 'Submitting…' : 'Post build'}
            </button>

            {/* editor popups */}
            {editEnemy !== null && roster.find(c => c.name === opponent[editEnemy]) && (
                <EnemyCookieEditor
                    cookie={roster.find(c => c.name === opponent[editEnemy])!}
                    info={opponentInfo[editEnemy]}
                    onChange={info => setOpponentInfo(prev => prev.map((v, idx) => idx === editEnemy ? info : v))}
                    onClose={() => setEditEnemy(null)} />
            )}
            {editMine !== null && roster.find(c => c.name === counter[editMine]) && (
                <CookieBuildEditor
                    cookie={roster.find(c => c.name === counter[editMine])!}
                    build={counterBuilds[editMine]}
                    onChange={b => setCounterBuilds(prev => prev.map((v, idx) => idx === editMine ? b : v))}
                    onClose={() => setEditMine(null)} />
            )}
        </div>
    );
}
