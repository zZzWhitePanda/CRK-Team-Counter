// community builds list, submit form and likes (FR05-FR08)

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
    // the build whose popup is open
    const [openBuild, setOpenBuild] = useState<PlayerBuild | null>(null);
    const [sort, setSort] = useState<BuildSort>('likes');

    // reload when the sort or login changes
    useEffect(() => {
        Promise.all([getBuilds(sort), getCookies()])
            .then(([topBuilds, cookies]) => { setBuilds(topBuilds); setRoster(cookies); })
            .catch(err => setError(err.message))
            .finally(() => setLoaded(true));
    }, [user, sort]);

    // count a view, once per build per day
    function handleOpen(build: PlayerBuild) {
        setOpenBuild(build);
        const today = new Date().toISOString().slice(0, 10);
        const key = `crk_viewed_${build.build_id}_${today}`;
        if (!localStorage.getItem(key)) {
            countBuildView(build.build_id).catch(() => {});
            localStorage.setItem(key, '1');
            // update the card's count
            setBuilds(prev => prev.map(b =>
                b.build_id === build.build_id ? { ...b, views: (b.views ?? 0) + 1 } : b));
        }
    }

    // liking (FR06/FR07)
    async function handleLike(buildId: number) {
        if (!user) { setShowAuth(true); return; }   // login needed
        try {
            const res = await likeBuild(buildId);
            const apply = (b: PlayerBuild) =>
                b.build_id === buildId ? { ...b, likes: res.likes, likedByMe: res.likedByMe } : b;
            setBuilds(prev => prev.map(apply));
            // update the open popup too
            setOpenBuild(prev => (prev ? apply(prev) : prev));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not like that.');
        }
    }

    return (
        <div>
            <h1 style={{ marginBottom: 16 }}>Community Builds</h1>

            {/* sort and submit */}
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

            {/* submit form */}
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

            {/* loading */}
            {!loaded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
                </div>
            )}

            {/* nothing found */}
            {loaded && !error && builds.length === 0 && (
                <div className="card">
                    <p>No community builds yet — {user ? 'be the first to submit one above!' : 'log in and be the first to submit one!'}</p>
                </div>
            )}

            {/* the build list */}
            {builds.map((build, index) => (
                <BuildCard
                    key={build.build_id}
                    build={build}
                    roster={roster}
                    // rank badge only makes sense sorted by likes
                    rank={sort === 'likes' ? index + 1 : undefined}
                    onOpen={() => handleOpen(build)}
                    onLike={() => handleLike(build.build_id)}
                />
            ))}

            {/* the full build popup */}
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

// one sort option
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

// the submit a build form
function SubmitForm({ roster, onSubmitted }: { roster: Cookie[]; onSubmitted: (b: PlayerBuild) => void }) {
    // enemy side
    const [opponent, setOpponent] = useState<string[]>(['', '', '', '', '']);
    const [opponentInfo, setOpponentInfo] = useState<EnemyInfo[]>(() => Array.from({ length: 5 }, emptyEnemyInfo));
    const [enemyTreasures, setEnemyTreasures] = useState<TeamTreasures>(emptyTreasures);

    // your side
    const [counter, setCounter] = useState<string[]>(['', '', '', '', '']);
    const [counterBuilds, setCounterBuilds] = useState<CookieBuild[]>(() => Array.from({ length: 5 }, emptyBuild));
    const [yourTreasures, setYourTreasures] = useState<TeamTreasures>(emptyTreasures);

    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // which editor popup is open
    const [editEnemy, setEditEnemy] = useState<number | null>(null);
    const [editMine, setEditMine] = useState<number | null>(null);

    // drag to reorder, moving the builds with the names
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
        // the enemy team is optional
        if (cnt.length === 0) { setError('Pick at least one cookie for your team.'); return; }

        // the full details, saved in gearSetup
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

            {/* enemy team */}
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

            {/* your counter team */}
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

            {/* a summary of what you've set */}
            <TeamOverview
                team={counter}
                builds={counterBuilds}
                roster={roster}
                treasures={yourTreasures}
                onEdit={i => setEditMine(i)}
            />

            {/* note */}
            <label htmlFor="build-note" className="field-label" style={{ marginTop: 24 }}>Note (optional, max 1000)</label>
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

            {/* the editor popups */}
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
