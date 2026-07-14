// ============================================================
// CommunityBuildsPage.tsx - mockup 1: the most liked builds
// across the whole site (FR08), ranked cards with the teal
// rank badge, VS./USE rows and the like count.
//
// The Submit button is here but disabled - submitting needs
// login, which is the next build phase (auth). Being honest
// about that in the UI beats a button that silently fails.
// ============================================================

import { useEffect, useState } from 'react';
import { Trophy, Plus, Heart } from 'lucide-react';
import { Cookie, getCookies, getTopTeams, PlayerBuild } from '../api';
import { TeamRow } from '../components/TeamRow';

export function CommunityBuildsPage() {
    const [builds, setBuilds] = useState<PlayerBuild[]>([]);
    const [roster, setRoster] = useState<Cookie[]>([]);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // both requests run at the same time, page renders when done
        Promise.all([getTopTeams(), getCookies()])
            .then(([topTeams, cookies]) => {
                setBuilds(topTeams);
                setRoster(cookies);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoaded(true));
    }, []);

    return (
        <div>
            <h1 style={{ marginBottom: 16 }}>Community Builds</h1>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                <button className="pill active" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={16} aria-hidden="true" /> Top
                </button>
                <button
                    className="pill"
                    disabled
                    title="Submitting builds needs an account - login is coming in the next build phase"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5, cursor: 'not-allowed' }}
                >
                    <Plus size={16} aria-hidden="true" /> Submit (needs login - coming soon)
                </button>
            </div>

            {error && <div className="error-box" role="alert">{error}</div>}

            {loaded && !error && builds.length === 0 && (
                <div className="card">
                    <p>No community builds yet — be the first to submit one!</p>
                </div>
            )}

            {builds.map((build, index) => (
                <div key={build.build_id} className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                        {/* rank badge - teal square like mockup 1 */}
                        <span
                            style={{
                                background: 'var(--color-rank)',
                                color: '#12352F',
                                fontFamily: 'var(--font-heading)',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 16,
                            }}
                        >
                            #{index + 1}
                        </span>
                        <h3 style={{ flex: 1 }}>
                            {build.counter_team[0]} Comp
                        </h3>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 700 }}>
                            <Heart size={18} aria-hidden="true" /> {build.likes}
                        </span>
                    </div>

                    <p className="muted" style={{ marginBottom: 12 }}>by {build.username}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <TeamRow label="VS." kind="enemy" cookieNames={build.opponent_team} allCookies={roster} />
                        <TeamRow label="USE" kind="ally" cookieNames={build.counter_team} allCookies={roster} />
                    </div>

                    {build.note && <p style={{ marginTop: 12 }}>{build.note}</p>}
                </div>
            ))}
        </div>
    );
}
