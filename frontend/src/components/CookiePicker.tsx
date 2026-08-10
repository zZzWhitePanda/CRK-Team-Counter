// ============================================================
// CookiePicker.tsx - a visual, searchable cookie chooser.
//
// Clicking a slot opens a wide popup showing every cookie with its
// PORTRAIT, name and rarity. It has the same search + "Sort by"
// drop-down + direction toggle as the Cookies page, and splits the
// roster into sections with headings so 190 cookies stay readable.
// ============================================================

import { useState, useMemo } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { Cookie, cookieImageUrl } from '../api';
import { SortControls } from './SortControls';
import { SortField, groupCookies, rarityColor } from '../cookieSort';

interface CookiePickerProps {
    roster: Cookie[];
    selectedName: string;            // '' if the slot is empty
    disabledNames: string[];         // cookies already picked elsewhere
    onPick: (name: string) => void;
    onClear: () => void;
}

export function CookiePicker({ roster, selectedName, disabledNames, onPick, onClear }: CookiePickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    // default = rarity, ascending (Common -> highest rarity)
    const [sortField, setSortField] = useState<SortField>('rarity');
    const [ascending, setAscending] = useState(true);

    const selected = roster.find(c => c.name === selectedName);

    // filter by the search text (name OR type), then group + sort
    const groups = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q
            ? roster.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
            : roster;
        return groupCookies(list, sortField, ascending);
    }, [roster, search, sortField, ascending]);

    const nResults = groups.reduce((n, g) => n + g.cookies.length, 0);

    return (
        <>
            {/* ---- the slot button ---- */}
            {selected ? (
                <div className="picker-slot filled" style={{ borderColor: rarityColor(selected.rarity) }}>
                    <button className="picker-slot-main" onClick={() => setOpen(true)} title="Change cookie">
                        <img src={cookieImageUrl(selected.image_file)} alt={selected.name} width={44} height={44} loading="lazy" />
                        <span className="picker-slot-name">{selected.name}</span>
                    </button>
                    <button className="picker-slot-clear" onClick={onClear} aria-label={`Remove ${selected.name}`}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button className="picker-slot empty" onClick={() => setOpen(true)}>
                    <Plus size={22} />
                    <span>Add cookie</span>
                </button>
            )}

            {/* ---- the picker popup ---- */}
            {open && (
                <div className="modal-backdrop" onClick={() => setOpen(false)}>
                    <div className="modal-card picker-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
                            <X size={20} />
                        </button>
                        <h2 style={{ marginBottom: 14 }}>
                            Choose a cookie{' '}
                            <span className="muted" style={{ fontSize: 15, fontFamily: 'var(--font-body)' }}>
                                {nResults}
                            </span>
                        </h2>

                        <div className="roster-toolbar" style={{ marginBottom: 14 }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                <Search size={18} aria-hidden="true"
                                    style={{ position: 'absolute', left: 14, top: 14, color: 'var(--color-text-muted)' }} />
                                <input className="input" style={{ paddingLeft: 42 }}
                                    placeholder="Search by name or type…"
                                    value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                            </div>
                            <SortControls compact
                                field={sortField} ascending={ascending}
                                onFieldChange={setSortField}
                                onToggleDirection={() => setAscending(v => !v)} />
                        </div>

                        <div className="picker-scroll">
                            {groups.map(group => (
                                <section key={group.key || 'all'} style={{ marginBottom: 18 }}>
                                    {group.key && (
                                        <h3 className="group-heading small">
                                            <span className="group-dot"
                                                style={{ background: sortField === 'rarity' ? rarityColor(group.key) : 'var(--color-primary)' }} />
                                            {group.key}
                                            <span className="muted group-count">{group.cookies.length}</span>
                                        </h3>
                                    )}
                                    <div className="picker-grid">
                                        {group.cookies.map(cookie => {
                                            const taken = disabledNames.includes(cookie.name) && cookie.name !== selectedName;
                                            return (
                                                <button
                                                    key={cookie.cookie_id}
                                                    className="picker-option"
                                                    style={{ borderTopColor: rarityColor(cookie.rarity), opacity: taken ? 0.35 : 1 }}
                                                    disabled={taken}
                                                    title={taken ? 'Already on the team' : cookie.name}
                                                    onClick={() => { onPick(cookie.name); setOpen(false); setSearch(''); }}
                                                >
                                                    <img src={cookieImageUrl(cookie.image_file)} alt={cookie.name}
                                                         width={56} height={56} loading="lazy" />
                                                    <span className="picker-option-name">{cookie.name}</span>
                                                    <span style={{ color: rarityColor(cookie.rarity), fontSize: 10, fontWeight: 700 }}>
                                                        {cookie.rarity.toUpperCase()}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                            {nResults === 0 && (
                                <p className="muted">No cookies match “{search}”.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
