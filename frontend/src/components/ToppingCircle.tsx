// ============================================================
// ToppingCircle.tsx - the in-game topping board.
//
// Cookie Run: Kingdom lays toppings out on a star-shaped board
// with one topping sitting INSIDE each of the star's five wedges,
// and the equipped Topping Tart forms the jewelled frame behind
// it. This reproduces that.
//
// The board art is the game's own, taken from the wiki:
//   Topping tart base.png        -> topping-board/none.png
//   Topping tart <flavour> 3.png -> topping-board/<flavour>.png
// at 272px, which is the size the game's own UI uses.
//
// The five slots are placed at 72-degree intervals starting at
// the top, at a radius that lands them in the middle of each
// wedge rather than floating in a ring outside the star.
// ============================================================

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
    TOPPINGS, TOPPING_SUBSTATS, ToppingSlot, SubStat,
    toppingImageUrl, toppingBoardUrl,
} from '../gear';

interface ToppingCircleProps {
    slots: (ToppingSlot | null)[];        // the 5 slots
    tart: string | null;                  // equipped tart, re-skins the board
    onChange: (slots: (ToppingSlot | null)[]) => void;
}

// Each of the 5 slots sits at a 72-degree interval around the board.
// The actual distance from the centre lives in CSS as --wedge-radius
// on .topping-board, so it can be tuned alongside the other sizing
// knobs in theme.css without touching this file.
// Per-slot fine-tune. The star artwork isn't perfectly 5-fold
// symmetric, so each wedge gets a tiny nudge from the shared radius.
// Percentages of the board width, so they scale on mobile. Kept
// here (not in theme.css) so a wrapper element's inline
// --slot-N-dx can override — theme.css sitting on .topping-board
// itself would beat any inherited value.
const SLOT_NUDGE: Array<{dx: string; dy: string}> = [
    { dx: '-0.31%', dy: '-1.56%' },
    { dx:  '0.94%', dy: '-0.94%' },
    { dx:  '0.31%', dy:  '0.31%' },
    { dx: '-1.56%', dy:  '0%'    },
    { dx: '-1.56%', dy: '-0.63%' },
];

function slotPosition(i: number) {
    const angle = (-90 + i * 72) * (Math.PI / 180);   // degrees -> radians
    const n = SLOT_NUDGE[i];
    return {
        left: `calc(50% + var(--wedge-radius) * ${Math.cos(angle).toFixed(4)} + var(--slot-${i}-dx, ${n.dx}))`,
        top:  `calc(50% + var(--wedge-radius) * ${Math.sin(angle).toFixed(4)} + var(--slot-${i}-dy, ${n.dy}))`,
        // Each wedge points a different way, and in game the topping
        // is TILTED to sit square in its wedge rather than all five
        // pointing straight up. Slot 0 is the top wedge (no tilt) and
        // every slot after it is another 72 degrees round.
        '--wedge-tilt': `${i * 72}deg`,
    } as React.CSSProperties;
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
    const tartName = tart ? TOPPINGS.find(t => t.key === tart)?.name : null;

    return (
        <div className="topping-board-wrap">
            <div className={'topping-board' + (filled === 5 ? ' complete' : '')}>
                {/* The star board. Its artwork already includes the
                    tart's jewelled frame, so swapping the tart swaps
                    the whole board - exactly like the game does. */}
                <img
                    className="topping-board-art"
                    src={toppingBoardUrl(tart)}
                    alt={tartName ? `${tartName} Topping Tart equipped` : 'No Topping Tart equipped'}
                />

                {/* one topping sitting in each of the five wedges */}
                {slots.map((slot, i) => {
                    const pos = slotPosition(i);
                    const topping = slot ? TOPPINGS.find(t => t.key === slot.toppingKey) : null;
                    return (
                        <button
                            key={i}
                            className={'topping-wedge' + (slot ? ' filled' : '')}
                            style={pos}
                            onClick={() => setEditing(i)}
                            title={topping ? topping.name : 'Empty slot — click to add a topping'}
                            aria-label={topping ? `${topping.name}, click to change` : 'Empty topping slot'}
                        >
                            {slot ? (
                                <img src={toppingImageUrl(slot.toppingKey, slot.isTart)} alt="" />
                            ) : (
                                // no size prop - the CSS scales it with the
                                // board so it stays proportional on a phone
                                <Plus aria-hidden="true" />
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="muted topping-board-count">
                {filled} of 5 toppings{tartName && ` · ${tartName} Tart`}
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
                        <h2 style={{ marginBottom: 12, paddingRight: 36 }}>Choose a topping</h2>
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
                        <h2 style={{ marginBottom: 12, paddingRight: 36 }}>Topping sub-stats</h2>
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
