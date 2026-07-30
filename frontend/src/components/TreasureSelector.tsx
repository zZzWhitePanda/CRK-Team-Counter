// ============================================================
// TreasureSelector.tsx - the 3 team treasure slots.
//
// Treasures are equipped to the whole TEAM (not per cookie), so a
// team has 3 slots. Click a slot to open a searchable picker of all
// 45 treasures (with images); click one to equip it. Used on both
// the enemy team (Counter Tool) and both teams in the build form.
// ============================================================

import { useState, useMemo } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { TREASURES, TeamTreasures, treasureImageUrl } from '../gear';

interface Props {
    treasures: TeamTreasures;                 // 3 slots
    onChange: (t: TeamTreasures) => void;
}

export function TreasureSelector({ treasures, onChange }: Props) {
    // which slot's picker is open (null = none)
    const [picking, setPicking] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    function setSlot(index: number, key: string | null) {
        onChange(treasures.map((t, i) => i === index ? key : t));
    }

    // filter the treasure list by the search box
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? TREASURES.filter(t => t.name.toLowerCase().includes(q)) : TREASURES;
    }, [search]);

    return (
        <div>
            <div className="treasure-row">
                {treasures.map((key, i) => {
                    const treasure = TREASURES.find(t => t.key === key);
                    return (
                        <div key={i} className={'treasure-slot' + (treasure ? ' filled' : '')}>
                            <button className="treasure-slot-main" onClick={() => setPicking(i)}
                                title={treasure ? treasure.name : 'Add treasure'}>
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
                        <h2 style={{ marginBottom: 12 }}>Choose a treasure</h2>

                        <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Search size={18} aria-hidden="true"
                                style={{ position: 'absolute', left: 14, top: 14, color: 'var(--color-text-muted)' }} />
                            <input className="input" style={{ paddingLeft: 42 }} placeholder="Search treasures…"
                                value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                        </div>

                        <div className="picker-grid">
                            {filtered.map(t => {
                                const taken = treasures.includes(t.key) && treasures[picking] !== t.key;
                                return (
                                    <button key={t.key} className="picker-option" disabled={taken}
                                        style={{ opacity: taken ? 0.35 : 1 }}
                                        title={taken ? 'Already equipped' : t.name}
                                        onClick={() => { setSlot(picking, t.key); setPicking(null); setSearch(''); }}>
                                        <img src={treasureImageUrl(t.key)} alt={t.name} width={52} height={52} loading="lazy" />
                                        <span className="picker-option-name">{t.name}</span>
                                    </button>
                                );
                            })}
                            {filtered.length === 0 && (
                                <p className="muted" style={{ gridColumn: '1 / -1' }}>No treasures match “{search}”.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
