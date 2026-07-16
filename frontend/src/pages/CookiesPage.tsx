// ============================================================
// CookiesPage.tsx - the searchable roster (mockup 3).
// Search box + type pills + rarity pills, filtering the grid.
// The filtering itself happens on the backend (the pills just
// change the query), so it uses the same tested /api/cookies
// endpoint the drop-downs use.
// ============================================================

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Cookie, getCookies, cookieImageUrl } from '../api';

// pill options, matching the database CHECK rules
const TYPES = ['Charge', 'Defense', 'Magic', 'Ambush', 'Support', 'Bomber', 'Ranged', 'Healing', 'BTS'];
const RARITIES = ['Common', 'Rare', 'Special', 'Epic', 'Super Epic', 'Dragon', 'Legendary', 'Ancient', 'Beast', 'Witch'];

// each rarity gets its own accent colour (matches the CSS
// variables in theme.css) so the roster is colour-coded at a
// glance - a small usability win over plain grey cards.
export function rarityColor(rarity: string): string {
    const key = rarity.toLowerCase().replace(' ', '-');
    return `var(--rarity-${key}, var(--color-primary))`;
}

export function CookiesPage() {
    const [cookies, setCookies] = useState<Cookie[]>([]);
    const [total, setTotal] = useState(0);          // "X of 190 Cookies"
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');           // '' means All
    const [rarity, setRarity] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);   // show skeletons while fetching

    // get the full count once, for the "159 of 159" style label
    useEffect(() => {
        getCookies().then(all => setTotal(all.length)).catch(() => {});
    }, []);

    // re-fetch whenever a filter changes. The 250ms delay
    // (debounce) stops it firing on every single keystroke.
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            getCookies({ search, type, rarity })
                .then(result => { setCookies(result); setError(''); })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(timer);
    }, [search, type, rarity]);

    return (
        <div>
            <h1 style={{ marginBottom: 8 }}>
                Cookies{' '}
                <span className="muted" style={{ fontSize: 16, fontFamily: 'var(--font-body)' }}>
                    {cookies.length} of {total} Cookies
                </span>
            </h1>

            {/* search bar */}
            <div style={{ position: 'relative', margin: '16px 0' }}>
                <Search
                    size={18}
                    aria-hidden="true"
                    style={{ position: 'absolute', left: 16, top: 14, color: 'var(--color-text-muted)' }}
                />
                <label htmlFor="roster-search" style={{ position: 'absolute', left: -9999 }}>
                    Search roster
                </label>
                <input
                    id="roster-search"
                    className="input"
                    style={{ paddingLeft: 44 }}
                    placeholder="Search Roster..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* type pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button className={'pill' + (type === '' ? ' active' : '')} onClick={() => setType('')}>
                    ALL
                </button>
                {TYPES.map(t => (
                    <button
                        key={t}
                        className={'pill' + (type === t ? ' active' : '')}
                        onClick={() => setType(type === t ? '' : t)}
                    >
                        {t.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* rarity pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                <button className={'pill' + (rarity === '' ? ' active' : '')} onClick={() => setRarity('')}>
                    ALL
                </button>
                {RARITIES.map(r => (
                    <button
                        key={r}
                        className={'pill' + (rarity === r ? ' active' : '')}
                        onClick={() => setRarity(rarity === r ? '' : r)}
                    >
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            {error && <div className="error-box" role="alert">{error}</div>}

            {/* empty state instead of a blank page */}
            {!loading && !error && cookies.length === 0 && (
                <p className="muted">No cookies match those filters. Try clearing one.</p>
            )}

            {/* the roster grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 16,
                }}
            >
                {/* while loading, show shimmering placeholder cards
                    instead of a blank page (loading-states rule) */}
                {loading && Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 200 }} />
                ))}

                {!loading && cookies.map(cookie => {
                    const accent = rarityColor(cookie.rarity);
                    return (
                        <div
                            key={cookie.cookie_id}
                            className="card card-interactive"
                            style={{ padding: 16, textAlign: 'center', borderTop: `2px solid ${accent}` }}
                        >
                            <img
                                src={cookieImageUrl(cookie.image_file)}
                                alt={cookie.name}
                                width={96}
                                height={96}
                                loading="lazy"
                                style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}
                            />
                            <h3 style={{ fontSize: 15, margin: '10px 0 8px', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
                                {cookie.name}
                            </h3>
                            {/* rarity shown in its own colour */}
                            <div style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
                                {cookie.rarity.toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <span className="tag">{cookie.type}</span>
                                <span className="tag">{cookie.position}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
