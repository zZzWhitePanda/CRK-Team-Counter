// ============================================================
// CookiePicker.tsx - a visual, searchable cookie chooser.
//
// Replaces the plain name-only drop-downs on the Counter Tool.
// Clicking a slot opens a popup showing every cookie with its
// PORTRAIT, name and rarity, plus a search box to filter by name
// or type. Click a cookie to pick it. Much clearer than a text
// list of 190 names.
// ============================================================

import { useState, useMemo } from 'react';
import { X, Search, Plus, ArrowDownAZ, ArrowUp, ArrowDown } from 'lucide-react';
import { Cookie, cookieImageUrl } from '../api';
import { rarityColor, RARITY_RANK } from '../pages/CookiesPage';

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

    // how the picker list is ordered.
    // Default = rarity, ascending (Common -> highest rarity).
    const [sortField, setSortField] = useState<'rarity' | 'name'>('rarity');
    const [ascending, setAscending] = useState(true);

    const selected = roster.find(c => c.name === selectedName);

    // filter by the search text (name OR type), then sort by the
    // chosen field and direction.
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q
            ? roster.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
            : [...roster];

        list.sort((a, b) => {
            const cmp = sortField === 'name'
                ? a.name.localeCompare(b.name)                       // A -> Z
                : (RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity])    // Common -> highest
                    || a.name.localeCompare(b.name);                 // tie-break by name
            return ascending ? cmp : -cmp;   // flip for descending
        });
        return list;
    }, [roster, search, sortField, ascending]);

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
                        <h2 style={{ marginBottom: 12 }}>Choose a cookie</h2>

                        <div style={{ position: 'relative', marginBottom: 12 }}>
                            <Search size={18} aria-hidden="true"
                                style={{ position: 'absolute', left: 14, top: 14, color: 'var(--color-text-muted)' }} />
                            <input
                                className="input"
                                style={{ paddingLeft: 42 }}
                                placeholder="Search by name or type…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* sort controls: field (Rarity / A-Z) + direction toggle */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                            <span className="muted" style={{ fontSize: 13 }}>Sort by</span>
                            <button
                                className={'pill' + (sortField === 'rarity' ? ' active' : '')}
                                onClick={() => setSortField('rarity')}
                            >
                                Rarity
                            </button>
                            <button
                                className={'pill' + (sortField === 'name' ? ' active' : '')}
                                onClick={() => setSortField('name')}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                <ArrowDownAZ size={15} aria-hidden="true" /> A–Z
                            </button>
                            {/* direction toggle: flips up<->down each click */}
                            <button
                                className="pill"
                                onClick={() => setAscending(v => !v)}
                                title={ascending ? 'Ascending (low to high)' : 'Descending (high to low)'}
                                aria-label={ascending ? 'Sorting ascending, click for descending' : 'Sorting descending, click for ascending'}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
                            >
                                {ascending ? <ArrowUp size={15} aria-hidden="true" /> : <ArrowDown size={15} aria-hidden="true" />}
                                {sortField === 'name'
                                    ? (ascending ? 'A → Z' : 'Z → A')
                                    : (ascending ? 'Common → Top' : 'Top → Common')}
                            </button>
                        </div>

                        <div className="picker-grid">
                            {filtered.map(cookie => {
                                const taken = disabledNames.includes(cookie.name) && cookie.name !== selectedName;
                                return (
                                    <button
                                        key={cookie.cookie_id}
                                        className="picker-option"
                                        style={{ borderColor: rarityColor(cookie.rarity), opacity: taken ? 0.35 : 1 }}
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
                            {filtered.length === 0 && (
                                <p className="muted" style={{ gridColumn: '1 / -1' }}>No cookies match “{search}”.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
