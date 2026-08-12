// ============================================================
// CommunityBuildsPage.tsx - the most-liked community builds
// (FR08), plus (when logged in) a form to submit your own build
// (FR05) and like buttons on every build (FR06/FR07).
// ============================================================

import React, { useEffect, useState } from 'react';
import { Plus, Settings2, Gem, Heart, Eye, Sparkles, Clock } from 'lucide-react';
import { Cookie, PlayerBuild, BuildSort, getCookies, getBuilds, likeBuild, submitBuild, countBuildView } from '../api';
import { BuildCard } from '../components/BuildCard';
import { BuildDetail } from '../components/BuildDetail';
import { CookiePicker } from '../components/CookiePicker';
import { CookieBuildEditor } from '../components/CookieBuildEditor';
import { EnemyCookieEditor } from '../components/EnemyCookieEditor';
import { TreasureSelector } from '../components/TreasureSelector';
import { TeamOverview } from '../components/TeamOverview';
import { AuthModal } from '../components/AuthModal';
import { useDragReorder, moveItem } from '../useDragReorder';
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
    // the build whose full details popup is open, if any
    const [openBuild, setOpenBuild] = useState<PlayerBuild | null>(null);
    const [sort, setSort] = useState<BuildSort>('likes');

    // reload builds when the sort or login state changes.
    useEffect(() => {
        Promise.all([getBuilds(sort), getCookies()])
            .then(([topBuilds, cookies]) => { setBuilds(topBuilds); setRoster(cookies); })
            .catch(err => setError(err.message))
            .finally(() => setLoaded(true));
    }, [user, sort]);

    // ---- view counting ----
    // The browser sends a POST when the detail popup opens, and
    // remembers per build in localStorage so a refresh doesn't
    // run the number up. The key includes today's date so it can
    // be counted again tomorrow.
    function handleOpen(build: PlayerBuild) {
        setOpenBuild(build);
        const today = new Date().toISOString().slice(0, 10);
        const key = `crk_viewed_${build.build_id}_${today}`;
        if (!localStorage.getItem(key)) {
            countBuildView(build.build_id).catch(() => {});
            localStorage.setItem(key, '1');
            // reflect the new count on the card without a refetch
            setBuilds(prev => prev.map(b =>
                b.build_id === build.build_id ? { ...b, views: (b.views ?? 0) + 1 } : b));
        }
    }

    // ---- liking (FR06/FR07) ----
    async function handleLike(buildId: number) {
        if (!user) { setShowAuth(true); return; }   // must be logged in
        try {
            const res = await likeBuild(buildId);
            const apply = (b: PlayerBuild) =>
                b.build_id === buildId ? { ...b, likes: res.likes, likedByMe: res.likedByMe } : b;
            setBuilds(prev => prev.map(apply));
            // keep the open popup's heart in step with the list
            setOpenBuild(prev => (prev ? apply(prev) : prev));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not like that.');
        }
    }

    return (
        <div>
            <h1 style={{ marginBottom: 16 }}>Community Builds</h1>

            {/* ---- sort + submit ---- */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="sort-label">Sort by</span>
                <SortPill icon={<Heart size={14} aria-hidden="true" />} label="Most liked"
                    active={sort === 'likes'} onClick={() => setSort('likes')} />
                <SortPill icon={<Eye size={14} aria-hidden="true" />} label="Most viewed"
                    active={sort === 'views'} onClick={() => setSort('views')} />
                <SortPill icon={<Clock size={14} aria-hidden="true" />} label="Newest"
                    active={sort === 'newest'} onClick={() => setSort('newest')} />
                <SortPill icon={<Sparkles size={14} aria-hidden="true" />} label="Featured"
                    active={sort === 'featured'} onClick={() => setSort('featured')} />

                <button
                    className="pill"
                    style={{ marginLeft: 'auto' }}
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

            {/* the build list - click a card for the full build */}
            {builds.map((build, index) => (
                <BuildCard
                    key={build.build_id}
                    build={build}
                    roster={roster}
                    // Only show the rank badge when the order is
                    // by likes - it doesn't make sense on "Newest"
                    rank={sort === 'likes' ? index + 1 : undefined}
                    onOpen={() => handleOpen(build)}
                    onLike={() => handleLike(build.build_id)}
                />
            ))}

            {/* everything the author saved: toppings, tarts, beascuits,
                ascensions, levels and both teams' treasures */}
            {openBuild && (
                <BuildDetail
                    build={openBuild}
                    roster={roster}
                    onClose={() => setOpenBuild(null)}
                    onLike={() => handleLike(openBuild.build_id)}
                />
            )}

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    );
}

// ---- one of the four sort options ----
function SortPill({ icon, label, active, onClick }: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button className={'pill' + (active ? ' active' : '')} onClick={onClick}>
            {icon}{label}
        </button>
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

    // ---- drag to reorder ----
    // Order matters in game (front / middle / rear), so both teams
    // can be rearranged. Each drag has to move the cookie names AND
    // their parallel build/info arrays so a cookie keeps its gear.
    const enemyDrag = useDragReorder((from, to) => {
        setOpponent(prev => moveItem(prev, from, to));
        setOpponentInfo(prev => moveItem(prev, from, to));
    });
    const allyDrag = useDragReorder((from, to) => {
        setCounter(prev => moveItem(prev, from, to));
        setCounterBuilds(prev => moveItem(prev, from, to));
    });

    async function handleSubmit() {
        const opp = opponent.filter(n => n);
        const cnt = counter.filter(n => n);
        // The enemy team is OPTIONAL - leaving it empty posts a
        // general-purpose team ("this works against anything").
        if (cnt.length === 0) { setError('Pick at least one cookie for your team.'); return; }

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
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Submit a build</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
                Drag the cookies to change their order. The enemy team is optional —
                leave it empty to post a team that works against anything.
            </p>

            {/* ---- enemy team (level + stars only) ---- */}
            <p className="field-label" style={{ color: 'var(--color-enemy)' }}>
                Enemy team you're countering
                <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>optional</span>
            </p>
            <div className="picker-row" style={{ marginBottom: 12 }}>
                {opponent.map((name, i) => {
                    const cookie = roster.find(c => c.name === name);
                    const { className: dragClass, ...dragHandlers } =
                        cookie ? enemyDrag.slotProps(i) : { className: '' };
                    return (
                        <div key={i} className={'picker-cell ' + (dragClass ?? '')}
                             {...dragHandlers}>
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
                    const { className: dragClass, ...dragHandlers } =
                        cookie ? allyDrag.slotProps(i) : { className: '' };
                    return (
                        <div key={i} className={'picker-cell ' + (dragClass ?? '')}
                             {...dragHandlers}>
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

            {/* ---- what you've actually set, all in one place ----
                 Without this you'd have to open each cookie's Build
                 popup again to remember what you gave it. */}
            <TeamOverview
                team={counter}
                builds={counterBuilds}
                roster={roster}
                treasures={yourTreasures}
                onEdit={i => setEditMine(i)}
            />

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
