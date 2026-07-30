// ============================================================
// CookieBuildEditor.tsx - the full build screen for ONE cookie
// on the user's team: toppings (circle), beascuit, ascension and
// level. Opens as a popup from the "Your Team" section of the
// Counter Tool. Only the user's own cookies get this - you can't
// see the enemy's build in-game, so the enemy side stays plain.
// ============================================================

import { useState } from 'react';
import { X, Star, Plus } from 'lucide-react';
import { Cookie } from '../api';
import {
    CookieBuild, BEASCUITS, BEASCUIT_STATS, ASCENSION_LEVELS, SubStat, TOPPINGS,
    beascuitImageUrl, ascensionImageUrl, toppingImageUrl,
} from '../gear';
import { ToppingCircle } from './ToppingCircle';

interface Props {
    cookie: Cookie;
    build: CookieBuild;
    onChange: (build: CookieBuild) => void;
    onClose: () => void;
}

export function CookieBuildEditor({ cookie, build, onChange, onClose }: Props) {
    // patch helper: update part of the build and bubble it up
    const patch = (p: Partial<CookieBuild>) => onChange({ ...build, ...p });

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card build-editor" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
                <h2 style={{ marginBottom: 4 }}>{cookie.name}</h2>
                <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>Build customisation</p>

                {/* ---- Level + Ascension ---- */}
                <div className="build-row">
                    <div>
                        <label htmlFor="ck-level" className="field-label">Level</label>
                        <input id="ck-level" className="input" type="number" min={1} max={90}
                            style={{ width: 110 }}
                            value={build.level}
                            onChange={e => patch({ level: Number(e.target.value) })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <span className="field-label">Ascension</span>
                        <div className="ascension-row">
                            {ASCENSION_LEVELS.map(lvl => (
                                <button
                                    key={lvl}
                                    className={'ascension-btn' + (build.ascension === lvl ? ' active' : '')}
                                    onClick={() => patch({ ascension: lvl })}
                                    title={lvl === 0 ? 'Not ascended' : `${lvl}A`}
                                >
                                    {lvl === 0
                                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={14} /> None</span>
                                        : <img src={ascensionImageUrl(lvl)} alt={`${lvl}A`} height={20} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ---- Toppings (the in-game circle) ---- */}
                <h3 style={{ margin: '24px 0 8px' }}>Toppings</h3>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ToppingCircle cookie={cookie} slots={build.toppings}
                        onChange={toppings => patch({ toppings })} />
                </div>

                {/* ---- Topping Tart (its own single slot) ---- */}
                <h3 style={{ margin: '16px 0 8px' }}>Topping Tart</h3>
                <TartSlot tart={build.tart} onChange={tart => patch({ tart })} />

                {/* ---- Beascuit ---- */}
                <h3 style={{ margin: '16px 0 8px' }}>Beascuit</h3>
                <BeascuitSelector cookieType={cookie.type} build={build}
                    onChange={beascuit => patch({ beascuit })} />

                <button className="btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={onClose}>
                    Done
                </button>
            </div>
        </div>
    );
}

// ---- the single Topping Tart slot ----
// A cookie equips just ONE Topping Tart (separate from the 5 normal
// toppings), and it only has a primary stat - no sub-stats to set.
function TartSlot({ tart, onChange }: { tart: string | null; onChange: (t: string | null) => void }) {
    const [picking, setPicking] = useState(false);
    const current = TOPPINGS.find(t => t.key === tart);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className={'tart-slot' + (current ? ' filled' : '')} onClick={() => setPicking(true)}
                    title={current ? current.name : 'Add a Topping Tart'}>
                    {current
                        ? <img src={toppingImageUrl(current.key, true)} alt={current.name} width={48} height={48} />
                        : <Plus size={22} aria-hidden="true" />}
                </button>
                {current
                    ? <div>
                        <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{current.name} Tart</div>
                        <button className="link-button" onClick={() => onChange(null)}>Remove</button>
                      </div>
                    : <span className="muted" style={{ fontSize: 14 }}>No Topping Tart equipped</span>}
            </div>

            {picking && (
                <div className="modal-backdrop" onClick={() => setPicking(false)}>
                    <div className="modal-card picker-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setPicking(false)} aria-label="Close"><X size={20} /></button>
                        <h2 style={{ marginBottom: 12 }}>Choose a Topping Tart</h2>
                        <div className="picker-grid">
                            {TOPPINGS.map(t => (
                                <button key={t.key} className="picker-option"
                                    onClick={() => { onChange(t.key); setPicking(false); }} title={t.name}>
                                    <img src={toppingImageUrl(t.key, true)} alt={t.name} width={52} height={52} />
                                    <span className="picker-option-name">{t.name}</span>
                                    <span className="muted" style={{ fontSize: 10, fontWeight: 700 }}>{t.primaryStat}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ---- beascuit: pick one from the list, then enter its 4 stats ----
function BeascuitSelector({ cookieType, build, onChange }: {
    cookieType: string;
    build: CookieBuild;
    onChange: (b: CookieBuild['beascuit']) => void;
}) {
    const [picking, setPicking] = useState(false);
    const current = build.beascuit;

    function pick(key: string) {
        // start with the 4 named stat slots at 0
        const stats: SubStat[] = BEASCUIT_STATS.map(s => ({ stat: s, value: 0 }));
        onChange({ key, stats });
        setPicking(false);
    }
    function updateStat(i: number, value: number) {
        if (!current) return;
        onChange({ ...current, stats: current.stats.map((s, idx) => idx === i ? { ...s, value } : s) });
    }

    const currentType = current && BEASCUITS.find(b => b.key === current.key);

    return (
        <>
            {current ? (
                <div className="beascuit-current">
                    <img src={beascuitImageUrl(current.key)} alt="" width={56} height={56} />
                    <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{currentType?.name}</div>
                        <button className="link-button" onClick={() => setPicking(true)}>Change</button>
                    </div>
                </div>
            ) : (
                <button className="pill" onClick={() => setPicking(true)}>Select a beascuit</button>
            )}

            {/* the 4 stat inputs once a beascuit is chosen */}
            {current && (
                <div className="beascuit-stats">
                    {current.stats.map((s, i) => (
                        <div key={i}>
                            <label className="field-label" style={{ fontSize: 12 }}>{s.stat}</label>
                            <input className="input" type="number" min={0} step={0.1}
                                value={s.value}
                                onChange={e => updateStat(i, Number(e.target.value))} />
                        </div>
                    ))}
                </div>
            )}

            {/* the picker popup: 8 beascuits shown like a list */}
            {picking && (
                <div className="modal-backdrop" onClick={() => setPicking(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <button className="modal-close" onClick={() => setPicking(false)} aria-label="Close"><X size={20} /></button>
                        <h2 style={{ marginBottom: 12 }}>Choose a beascuit</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {BEASCUITS.map(b => {
                                const fits = b.cookieType === cookieType;   // matches this cookie's class
                                return (
                                    <button key={b.key} className="beascuit-row" onClick={() => pick(b.key)}>
                                        <img src={beascuitImageUrl(b.key)} alt="" width={44} height={44} />
                                        <span style={{ flex: 1, textAlign: 'left', color: 'var(--color-text)', fontWeight: 600 }}>{b.name}</span>
                                        {fits && <span className="tag" style={{ color: 'var(--color-rank)' }}>Fits {cookieType}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
