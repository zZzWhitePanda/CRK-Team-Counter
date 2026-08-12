// ============================================================
// TreasureSelector.tsx - the 3 team treasure slots.
//
// Treasures are equipped to the whole TEAM (not per cookie), so a
// team has 3 slots. Click a slot to open a searchable picker of
// all 45 treasures; click one to equip it.
//
// The picker is sorted by RARITY, best first, which is what people
// expect (the old version listed Common first, which buried the
// treasures anybody actually wants). A sort control lets you flip
// that or switch to A-Z, matching the cookie picker.
// ============================================================

import { useState, useMemo } from 'react';
import { X, Plus, Search, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import {
    TREASURES, TeamTreasures, TREASURE_RARITIES, TREASURE_RARITY_RANK,
    treasureImageUrl, Treasure,
} from '../gear';

interface Props {
    treasures: TeamTreasures;                 // 3 slots
    onChange: (t: TeamTreasures) => void;
}

type TreasureSort = 'rarity' | 'name';

// each rarity gets its own accent, re-using the cookie rarity
// tokens so the two pickers feel like the same site
function treasureRarityColor(rarity: string): string {
    return `var(--rarity-${rarity.toLowerCase()}, var(--color-primary))`;
}

export function TreasureSelector({ treasures, onChange }: Props) {
    // which slot's picker is open (null = none)
    const [picking, setPicking] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<TreasureSort>('rarity');
    // false = best first, which is the sensible default for treasures
    const [ascending, setAscending] = useState(false);

    function setSlot(index: number, key: string | null) {
        onChange(treasures.map((t, i) => i === index ? key : t));
    }

    // filter by the search box, then sort and split into sections
    const groups = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q ? TREASURES.filter(t => t.name.toLowerCase().includes(q)) : TREASURES;

        if (sort === 'name') {
            const sorted = [...list].sort((a, b) =>
                ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
            return [{ key: '', treasures: sorted }];
        }

        // one section per rarity, in rank order
        const order = ascending ? [...TREASURE_RARITIES] : [...TREASURE_RARITIES].reverse();
        return order
            .map(r => ({
                key: r,
                treasures: list.filter(t => t.rarity === r).sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .filter(g => g.treasures.length > 0);
    }, [search, sort, ascending]);

    const total = groups.reduce((n, g) => n + g.treasures.length, 0);

    return (
        <div>
            <div className="treasure-row">
                {treasures.map((key, i) => {
                    const treasure = TREASURES.find(t => t.key === key);
                    return (
                        <div key={i} className={'treasure-slot' + (treasure ? ' filled' : '')}
                             style={treasure ? { borderColor: treasureRarityColor(treasure.rarity) } : undefined}>
                            <button className="treasure-slot-main" onClick={() => setPicking(i)}
                                title={treasure ? `${treasure.name} (${treasure.rarity})` : 'Add treasure'}>
                                {treasure
                                    ? <img src={treasureImageUrl(treasure.key)} alt={treasure.name} width={52} height={52} />
                                    : <Plus size={22} aria-hidden="true" />}
                            </button>
                            {treasure && (
                                <button className="treasure-slot-clear" onClick={() => setSlot(i, null)}
                                    aria-label={`Remove ${treasure.name}`}><X size={13} /></button>
                            )}
                        </div>
                    );
                })}
            </div>

            {picking !== null && (
                <div className="modal-backdrop" onClick={() => setPicking(null)}>
                    <div className="modal-card picker-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setPicking(null)} aria-label="Close"><X size={20} /></button>
                        <h2 style={{ marginBottom: 12, paddingRight: 36 }}>
                            Choose a treasure{' '}
                            <span className="muted" style={{ fontSize: 15, fontFamily: 'var(--font-body)' }}>
                                {total}
                            </span>
                        </h2>

                        <div className="roster-toolbar" style={{ marginBottom: 14 }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                                <Search size={18} aria-hidden="true"
                                    style={{ position: 'absolute', left: 14, top: 14, color: 'var(--color-text-muted)' }} />
                                <input className="input" style={{ paddingLeft: 42 }} placeholder="Search treasures…"
                                    value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                            </div>

                            <div className="sort-controls compact">
                                <label htmlFor="treasure-sort" className="sort-label">Sort by</label>
                                <select id="treasure-sort" className="input sort-select" value={sort}
                                    onChange={e => setSort(e.target.value as TreasureSort)}>
                                    <option value="rarity">Rarity</option>
                                    <option value="name">Name</option>
                                </select>
                                <button
                                    className="sort-direction icon-only"
                                    onClick={() => setAscending(v => !v)}
                                    title={
                                        sort === 'name'
                                            ? (ascending ? 'A → Z (click to reverse)' : 'Z → A (click to reverse)')
                                            : (ascending ? 'Common → Epic (click to reverse)' : 'Epic → Common (click to reverse)')
                                    }
                                    aria-label="Reverse the sort order"
                                >
                                    {ascending
                                        ? <ArrowUpNarrowWide size={18} aria-hidden="true" />
                                        : <ArrowDownWideNarrow size={18} aria-hidden="true" />}
                                </button>
                            </div>
                        </div>

                        <div className="picker-scroll">
                            {groups.map(group => (
                                <section key={group.key || 'all'} style={{ marginBottom: 18 }}>
                                    {group.key && (
                                        <h3 className="group-heading small">
                                            <span className="group-dot"
                                                style={{ background: treasureRarityColor(group.key) }} />
                                            {group.key}
                                            <span className="muted group-count">{group.treasures.length}</span>
                                        </h3>
                                    )}
                                    <div className="picker-grid">
                                        {group.treasures.map(t => (
                                            <TreasureOption
                                                key={t.key}
                                                treasure={t}
                                                taken={treasures.includes(t.key) && treasures[picking] !== t.key}
                                                onPick={() => { setSlot(picking, t.key); setPicking(null); setSearch(''); }}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {total === 0 && (
                                <p className="muted">No treasures match “{search}”.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TreasureOption({ treasure, taken, onPick }: {
    treasure: Treasure; taken: boolean; onPick: () => void;
}) {
    const colour = treasureRarityColor(treasure.rarity);
    return (
        <button
            className="picker-option"
            style={{ borderTopColor: colour, opacity: taken ? 0.35 : 1 }}
            disabled={taken}
            title={taken ? 'Already equipped' : `${treasure.name} (${treasure.rarity})`}
            onClick={onPick}
        >
            <img src={treasureImageUrl(treasure.key)} alt={treasure.name}
                 width={52} height={52} loading="lazy" />
            <span className="picker-option-name">{treasure.name}</span>
            <span style={{ color: colour, fontSize: 10, fontWeight: 700 }}>
                {treasure.rarity.toUpperCase()}
            </span>
        </button>
    );
}
