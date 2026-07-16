// ============================================================
// CommunityBuildsPage.tsx - the most-liked community builds
// (FR08), plus (when logged in) a form to submit your own build
// (FR05) and like buttons on every build (FR06/FR07).
// ============================================================

import { useEffect, useState } from 'react';
import { Trophy, Plus, Heart } from 'lucide-react';
import { Cookie, PlayerBuild, getCookies, getTopBuilds, likeBuild, submitBuild } from '../api';
import { TeamRow } from '../components/TeamRow';
import { CookiePicker } from '../components/CookiePicker';
import { AuthModal } from '../components/AuthModal';
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
function SubmitForm({ roster, onSubmitted }: { roster: Cookie[]; onSubmitted: (b: PlayerBuild) => void }) {
    const [opponent, setOpponent] = useState<string[]>(['', '', '', '', '']);
    const [counter, setCounter] = useState<string[]>(['', '', '', '', '']);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const setSlot = (setter: typeof setOpponent, arr: string[], i: number, v: string) => {
        const next = [...arr]; next[i] = v; setter(next);
    };

    async function handleSubmit() {
        const opp = opponent.filter(n => n);
        const cnt = counter.filter(n => n);
        if (opp.length === 0) { setError('Pick at least one enemy cookie.'); return; }
        if (cnt.length === 0) { setError('Pick at least one cookie for your counter team.'); return; }

        setBusy(true); setError('');
        try {
            const build = await submitBuild({ opponentTeam: opp, counterTeam: cnt, gearSetup: {}, note });
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

            <p className="field-label" style={{ color: 'var(--color-enemy)' }}>Enemy team you're countering</p>
            <div className="picker-row" style={{ marginBottom: 20 }}>
                {opponent.map((name, i) => (
                    <CookiePicker key={i} roster={roster} selectedName={name}
                        disabledNames={opponent.filter(n => n)}
                        onPick={n => setSlot(setOpponent, opponent, i, n)}
                        onClear={() => setSlot(setOpponent, opponent, i, '')} />
                ))}
            </div>

            <p className="field-label" style={{ color: 'var(--color-ally)' }}>Your counter team</p>
            <div className="picker-row" style={{ marginBottom: 20 }}>
                {counter.map((name, i) => (
                    <CookiePicker key={i} roster={roster} selectedName={name}
                        disabledNames={counter.filter(n => n)}
                        onPick={n => setSlot(setCounter, counter, i, n)}
                        onClear={() => setSlot(setCounter, counter, i, '')} />
                ))}
            </div>

            <label htmlFor="build-note" className="field-label">Note (how it works — optional, max 1000)</label>
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
        </div>
    );
}
