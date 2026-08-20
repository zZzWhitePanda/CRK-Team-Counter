// the searchable cookie roster

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Cookie, PlayerBuild, getCookies, cookieImageUrl } from '../api';
import { SortControls } from '../components/SortControls';
import { CookieDetail } from '../components/CookieDetail';
import { BuildDetail } from '../components/BuildDetail';
import {
    SortField, TYPES, RARITIES, groupCookies, rarityColor, formatRelease,
} from '../cookieSort';

// re-exported for older imports
export { rarityColor };

export function CookiesPage() {
    const [cookies, setCookies] = useState<Cookie[]>([]);
    const [total, setTotal] = useState(0);          // full roster size
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');           // '' = all
    const [rarity, setRarity] = useState('');
    const [sortField, setSortField] = useState<SortField>('rarity');
    const [ascending, setAscending] = useState(false);  // highest first
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    // the cookie whose detail popup is open
    const [openCookie, setOpenCookie] = useState<Cookie | null>(null);
    // a community build opened from inside that popup
    const [openBuild, setOpenBuild] = useState<PlayerBuild | null>(null);

    // total count, for the label
    useEffect(() => {
        getCookies().then(all => setTotal(all.length)).catch(() => {});
    }, []);

    // refetch on filter change, waiting so it doesn't fire per keystroke
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

    // split into sections
    const groups = useMemo(
        () => groupCookies(cookies, sortField, ascending),
        [cookies, sortField, ascending]);

    return (
        <div>
            <h1 style={{ marginBottom: 8 }}>
                Cookies{' '}
                <span className="muted" style={{ fontSize: 16, fontFamily: 'var(--font-body)' }}>
                    {cookies.length} of {total} Cookies
                </span>
            </h1>

            {/* search + sort */}
            <div className="roster-toolbar">
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                    <Search size={18} aria-hidden="true"
                        style={{ position: 'absolute', left: 16, top: 14, color: 'var(--color-text-muted)' }} />
                    <label htmlFor="roster-search" style={{ position: 'absolute', left: -9999 }}>Search roster</label>
                    <input id="roster-search" className="input" style={{ paddingLeft: 44 }}
                        placeholder="Search by name…" value={search}
                        onChange={e => setSearch(e.target.value)} />
                </div>
                <SortControls
                    field={sortField} ascending={ascending}
                    onFieldChange={setSortField}
                    onToggleDirection={() => setAscending(v => !v)} />
            </div>

            {/* type pills */}
            <div className="filter-pills">
                <button className={'pill' + (type === '' ? ' active' : '')} onClick={() => setType('')}>ALL</button>
                {TYPES.map(t => (
                    <button key={t} className={'pill' + (type === t ? ' active' : '')}
                        onClick={() => setType(type === t ? '' : t)}>{t.toUpperCase()}</button>
                ))}
            </div>

            {/* rarity pills */}
            <div className="filter-pills" style={{ marginBottom: 24 }}>
                <button className={'pill' + (rarity === '' ? ' active' : '')} onClick={() => setRarity('')}>ALL</button>
                {RARITIES.map(r => (
                    <button key={r} className={'pill' + (rarity === r ? ' active' : '')}
                        onClick={() => setRarity(rarity === r ? '' : r)}>{r.toUpperCase()}</button>
                ))}
            </div>

            {error && <div className="error-box" role="alert">{error}</div>}

            {!loading && !error && cookies.length === 0 && (
                <p className="muted">No cookies match those filters. Try clearing one.</p>
            )}

            {/* loading */}
            {loading && (
                <div className="cookie-grid">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 200 }} />
                    ))}
                </div>
            )}

            {/* the roster */}
            {!loading && groups.map(group => (
                <section key={group.key || 'all'} style={{ marginBottom: 28 }}>
                    {group.key && (
                        <h2 className="group-heading">
                            <span className="group-dot"
                                style={{ background: sortField === 'rarity' ? rarityColor(group.key) : 'var(--color-primary)' }} />
                            {group.key}
                            <span className="muted group-count">{group.cookies.length}</span>
                        </h2>
                    )}
                    <div className="cookie-grid">
                        {group.cookies.map(cookie => {
                            const accent = rarityColor(cookie.rarity);
                            return (
                                <div key={cookie.cookie_id} className="card card-interactive cookie-card"
                                    style={{ borderTop: `2px solid ${accent}` }}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setOpenCookie(cookie)}
                                    // keyboard users can open it too
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault(); setOpenCookie(cookie);
                                        }
                                    }}
                                    title={`${cookie.name} — click for the full details`}>
                                    <img src={cookieImageUrl(cookie.image_file)} alt={cookie.name}
                                        width={76} height={76} loading="lazy"
                                        style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }} />
                                    <h3 className="cookie-card-name">{cookie.name}</h3>
                                    <div style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
                                        {cookie.rarity.toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <span className="tag">{cookie.type}</span>
                                        <span className="tag">{cookie.position}</span>
                                    </div>
                                    {/* only shown when sorting by release */}
                                    {sortField === 'release' && (
                                        <div className="cookie-card-release">
                                            {formatRelease(cookie.release_date)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}

            {openCookie && (
                <CookieDetail
                    cookie={openCookie}
                    onClose={() => setOpenCookie(null)}
                    onOpenBuild={build => setOpenBuild(build)}
                />
            )}

            {openBuild && (
                <BuildDetail
                    build={openBuild}
                    roster={cookies}
                    onClose={() => setOpenBuild(null)}
                />
            )}
        </div>
    );
}
