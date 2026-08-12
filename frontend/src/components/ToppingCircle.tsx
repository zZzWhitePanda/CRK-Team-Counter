// ============================================================
// ToppingCircle.tsx - the in-game topping screen.
//
// Cookie Run: Kingdom shows toppings on a STAR-shaped board with
// one slot per point, and the board itself is re-skinned by
// whichever Topping Tart is equipped (no tart = a plain dark
// star, a raspberry tart turns it red, and so on).
//
// This copies that. The board images are the game's own art,
// pulled from the wiki (assets/tart-board/<flavour>.png), and
// the five slots are positioned over the star's points.
//
// An empty slot is a dashed outline; click it to pick a topping
// and set its sub-stats. Click a filled one to change or remove.
// ============================================================

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
    TOPPINGS, TOPPING_SUBSTATS, ToppingSlot, SubStat,
    toppingImageUrl, tartBoardUrl,
} from '../gear';

interface ToppingCircleProps {
    slots: (ToppingSlot | null)[];        // the 5 slots
    tart: string | null;                  // equipped tart, re-skins the board
    onChange: (slots: (ToppingSlot | null)[]) => void;
}

// Where each of the 5 slots sits. A five-pointed star has a point
// every 72 degrees starting at the top, which is exactly where the
// game puts its topping slots.
const BOX = 300;                          // board container size (px)
const RADIUS = 112;                       // how far slots sit from centre
const SLOT = 58;                          // slot size
function slotPosition(i: number) {
    const angle = (-90 + i * 72) * (Math.PI / 180);   // degrees -> radians
    return {
        left: BOX / 2 + RADIUS * Math.cos(angle) - SLOT / 2,
        top: BOX / 2 + RADIUS * Math.sin(angle) - SLOT / 2,
    };
}

export function ToppingCircle({ slots, tart, onChange }: ToppingCircleProps) {
    // which slot's editor is open (null = none)
    const [editing, setEditing] = useState<number | null>(null);

    function setSlot(index: number, value: ToppingSlot | null) {
        const next = [...slots];
        next[index] = value;
        onChange(next);
    }

    const filled = slots.filter(Boolean).length;

    return (
        <div>
            <div className="topping-board" style={{ width: BOX, height: BOX }}>
                {/* The star board. Its artwork changes with the tart,
                    the same way it does in game. */}
                <img
                    className={'topping-board-star' + (filled === 5 ? ' complete' : '')}
                    src={tartBoardUrl(tart)}
                    alt={tart ? `${tart} Topping Tart equipped` : 'No Topping Tart equipped'}
                />

                {/* the 5 slots around it */}
                {slots.map((slot, i) => {
                    const pos = slotPosition(i);
                    const topping = slot ? TOPPINGS.find(t => t.key === slot.toppingKey) : null;
                    return (
                        <button
                            key={i}
                            className={'topping-slot-ring' + (slot ? ' filled' : '')}
                            style={{ left: pos.left, top: pos.top, width: SLOT, height: SLOT }}
                            onClick={() => setEditing(i)}
                            title={topping ? topping.name : 'Empty — click to add a topping'}
                        >
                            {slot ? (
                                <img src={toppingImageUrl(slot.toppingKey, slot.isTart)}
                                     alt="" width={40} height={40} />
                            ) : (
                                <Plus size={20} aria-hidden="true" />
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="muted topping-board-count">
                {filled} of 5 toppings
                {tart && ` · ${TOPPINGS.find(t => t.key === tart)?.name ?? tart} Tart`}
            </p>

            {editing !== null && (
                <ToppingSlotEditor
                    slot={slots[editing]}
                    onSave={value => { setSlot(editing, value); setEditing(null); }}
                    onRemove={() => { setSlot(editing, null); setEditing(null); }}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}

// ---- the popup for one slot: pick a topping, then its sub-stats ----
function ToppingSlotEditor({ slot, onSave, onRemove, onClose }: {
    slot: ToppingSlot | null;
    onSave: (s: ToppingSlot) => void;
    onRemove: () => void;
    onClose: () => void;
}) {
    // draft state so nothing changes until "Save"
    const [toppingKey, setToppingKey] = useState(slot?.toppingKey ?? '');
    const [isTart, setIsTart] = useState(slot?.isTart ?? false);
    const [substats, setSubstats] = useState<SubStat[]>(slot?.substats ?? []);
    // 'pick' = choosing a topping, 'stats' = setting sub-stats
    const [step, setStep] = useState<'pick' | 'stats'>(slot ? 'stats' : 'pick');

    function choose(key: string) {
        setToppingKey(key);
        setIsTart(false);   // the board holds normal toppings; tarts are a separate slot
        setStep('stats');
    }

    function addSubstat() {
        if (substats.length >= 3) return;   // max 3 bonus effects (M topping)
        setSubstats([...substats, { stat: TOPPING_SUBSTATS[0], value: 1 }]);
    }
    function updateSubstat(i: number, patch: Partial<SubStat>) {
        setSubstats(substats.map((s, idx) => idx === i ? { ...s, ...patch } : s));
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card picker-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

                {step === 'pick' && (
                    <>
                        <h2 style={{ marginBottom: 12 }}>Choose a topping</h2>
                        <div className="picker-scroll">
                            <div className="picker-grid">
                                {TOPPINGS.map(t => (
                                    <button key={t.key} className="picker-option" onClick={() => choose(t.key)} title={t.name}>
                                        <img src={toppingImageUrl(t.key, false)} alt={t.name} width={52} height={52} />
                                        <span className="picker-option-name">{t.name}</span>
                                        <span className="muted" style={{ fontSize: 10, fontWeight: 700 }}>{t.primaryStat}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {step === 'stats' && (
                    <>
                        <h2 style={{ marginBottom: 12 }}>Topping sub-stats</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                            <img src={toppingImageUrl(toppingKey, isTart)} alt="" width={64} height={64} />
                            <div>
                                <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>
                                    {TOPPINGS.find(t => t.key === toppingKey)?.name}
                                    {isTart && ' (Tart)'}
                                </div>
                                <button className="link-button" onClick={() => setStep('pick')}>Change topping</button>
                            </div>
                        </div>

                        {/* sub-stat rows: stat drop-down + value */}
                        {substats.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select className="input" value={s.stat}
                                        onChange={e => updateSubstat(i, { stat: e.target.value })}>
                                    {TOPPING_SUBSTATS.map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                                <div style={{ position: 'relative', width: 110, flexShrink: 0 }}>
                                    <input className="input" type="number" min={0} step={0.1}
                                        style={{ paddingRight: 24 }}
                                        value={s.value}
                                        onChange={e => updateSubstat(i, { value: Number(e.target.value) })} />
                                    <span style={{ position: 'absolute', right: 12, top: 12, color: 'var(--color-text-muted)' }}>%</span>
                                </div>
                            </div>
                        ))}

                        {substats.length < 3 && (
                            <button className="pill" onClick={addSubstat} style={{ marginTop: 4 }}>
                                <Plus size={15} /> Add sub-stat
                            </button>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={() => onSave({ toppingKey, isTart, substats })}>
                                Save topping
                            </button>
                            {slot && (
                                <button className="btn-ghost" onClick={onRemove} style={{ color: 'var(--color-danger)' }}>
                                    <Trash2 size={16} /> Remove
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
