// the star-shaped topping board with 5 slots

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
    TOPPINGS, TOPPING_SUBSTATS, ToppingSlot,
    toppingImageUrl, toppingBoardUrl,
} from '../gear';

interface ToppingCircleProps {
    slots: (ToppingSlot | null)[];        // the 5 slots
    tart: string | null;                  // equipped tart, changes the art
    onChange: (slots: (ToppingSlot | null)[]) => void;
}

// small position tweaks per slot, one set per board size
const SLOT_NUDGE_TART: Array<{dx: string; dy: string}> = [
    { dx: '-0.31%', dy: '-1.56%' },
    { dx:  '0.94%', dy: '-0.94%' },
    { dx:  '0.31%', dy:  '0.31%' },
    { dx: '-1.56%', dy:  '0%'    },
    { dx: '-1.56%', dy: '-0.63%' },
];
const SLOT_NUDGE_NONE: Array<{dx: string; dy: string}> = [
    { dx: '-0.51%', dy: '-0.16%' },
    { dx:  '1.94%', dy:  '0.66%' },
    { dx:  '0.91%', dy:  '2.91%' },
    { dx: '-1.56%', dy:  '2.6%'  },
    { dx: '-2.16%', dy:  '0.57%' },
];

function slotPosition(i: number, hasTart: boolean) {
    const angle = (-90 + i * 72) * (Math.PI / 180);   // to radians
    const n = (hasTart ? SLOT_NUDGE_TART : SLOT_NUDGE_NONE)[i];
    return {
        left: `calc(50% + var(--wedge-radius) * ${Math.cos(angle).toFixed(4)} + var(--slot-${i}-dx, ${n.dx}))`,
        top:  `calc(50% + var(--wedge-radius) * ${Math.sin(angle).toFixed(4)} + var(--slot-${i}-dy, ${n.dy}))`,
        // tilt each topping to sit square in its wedge
        '--wedge-tilt': `${i * 72}deg`,
    } as React.CSSProperties;
}

export function ToppingCircle({ slots, tart, onChange }: ToppingCircleProps) {
    // which slot's editor is open
    const [editing, setEditing] = useState<number | null>(null);
    // which filled slot is being dragged, so it can be copied to an empty one
    const [dragging, setDragging] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<number | null>(null);

    function setSlot(index: number, value: ToppingSlot | null) {
        const next = [...slots];
        next[index] = value;
        onChange(next);
    }

    // Dragging a finished topping onto an empty slot copies it, so the same
    // sub-stats do not have to be entered five times over. The copy is a new
    // object so editing one slot later does not change the other.
    function copyTo(from: number, to: number) {
        const source = slots[from];
        if (!source || slots[to]) return;
        setSlot(to, { ...source, substats: [...source.substats] });
    }

    const filled = slots.filter(Boolean).length;
    const tartName = tart ? TOPPINGS.find(t => t.key === tart)?.name : null;

    return (
        <div className="topping-board-wrap">
            <div className={'topping-board' + (filled === 5 ? ' complete' : '')}>
                {/* the star board. Its artwork already includes the
                    tart's jewelled frame, so swapping the tart swaps
                    the whole board - exactly like the game does. */}
                <img
                    className="topping-board-art"
                    src={toppingBoardUrl(tart)}
                    alt={tartName ? `${tartName} Topping Tart equipped` : 'No Topping Tart equipped'}
                />

                {/* the five toppings */}
                {slots.map((slot, i) => {
                    const pos = slotPosition(i, tart !== null);
                    const topping = slot ? TOPPINGS.find(t => t.key === slot.toppingKey) : null;
                    return (
                        <button
                            key={i}
                            className={'topping-wedge'
                                + (slot ? ' filled' : '')
                                + (dragging === i ? ' dragging' : '')
                                + (dropTarget === i ? ' drop-target' : '')}
                            style={pos}
                            onClick={() => setEditing(i)}
                            draggable={slot !== null}
                            onDragStart={e => {
                                if (!slot) return;
                                setDragging(i);
                                // firefox needs data set to start a drag
                                e.dataTransfer.setData('text/plain', String(i));
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onDragOver={e => {
                                if (dragging === null || slots[i]) return;
                                e.preventDefault();          // marks this as a drop target
                                e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDragEnter={() => { if (dragging !== null && !slots[i]) setDropTarget(i); }}
                            onDragLeave={() => setDropTarget(t => (t === i ? null : t))}
                            onDrop={e => {
                                e.preventDefault();
                                const from = Number(e.dataTransfer.getData('text/plain'));
                                if (Number.isInteger(from) && from !== i) copyTo(from, i);
                                setDragging(null);
                                setDropTarget(null);
                            }}
                            onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                            title={topping
                                ? `${topping.name}. Drag onto an empty slot to copy it.`
                                : 'Empty slot. Click to add a topping, or drop one here to copy it.'}
                            aria-label={topping ? `${topping.name}, click to change` : 'Empty topping slot'}
                        >
                            {slot ? (
                                <img src={toppingImageUrl(slot.toppingKey, slot.isTart)} alt="" />
                            ) : (
                                // sized by CSS so it scales with the board
                                <Plus aria-hidden="true" />
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="muted topping-board-count">
                {filled} of 5 toppings{tartName && ` · ${tartName} Tart`}
            </p>
            {filled > 0 && filled < 5 && (
                <p className="muted topping-board-hint">
                    Drag a topping onto an empty slot to copy its sub-stats.
                </p>
            )}

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

// popup for one slot: pick a topping, then its stats
function ToppingSlotEditor({ slot, onSave, onRemove, onClose }: {
    slot: ToppingSlot | null;
    onSave: (s: ToppingSlot) => void;
    onRemove: () => void;
    onClose: () => void;
}) {
    // nothing changes until Save
    const [toppingKey, setToppingKey] = useState(slot?.toppingKey ?? '');
    const [isTart, setIsTart] = useState(slot?.isTart ?? false);
    const [substats, setSubstats] = useState<string[]>(slot?.substats ?? []);
    // which step we're on
    const [step, setStep] = useState<'pick' | 'stats'>(slot ? 'stats' : 'pick');

    function choose(key: string) {
        setToppingKey(key);
        setIsTart(false);   // tarts have their own slot
        setStep('stats');
    }

    function addSubstat() {
        if (substats.length >= 3) return;   // max 3
        setSubstats([...substats, TOPPING_SUBSTATS[0]]);
    }
    function updateSubstat(i: number, value: string) {
        setSubstats(substats.map((s, idx) => idx === i ? value : s));
    }
    function removeSubstat(i: number) {
        setSubstats(substats.filter((_, idx) => idx !== i));
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

                        {/* sub-stat rows */}
                        {substats.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select className="input" value={s}
                                        onChange={e => updateSubstat(i, e.target.value)}
                                        aria-label={`Sub-stat ${i + 1}`}>
                                    {TOPPING_SUBSTATS.map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                                <button className="pill danger icon-only" onClick={() => removeSubstat(i)}
                                        aria-label={`Remove sub-stat ${i + 1}`}>
                                    <Trash2 size={15} />
                                </button>
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
