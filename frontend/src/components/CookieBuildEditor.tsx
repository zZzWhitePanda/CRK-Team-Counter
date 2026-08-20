// the full build editor for one of your cookies

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Cookie } from '../api';
import {
    CookieBuild, BEASCUITS, TOPPINGS, toppingImageUrl,
    BEASCUIT_RARITIES, BEASCUIT_BONUS_SLOTS, BEASCUIT_ELEMENTS, BeascuitRarity,
    beascuitSubstatOptions, beascuitName, emptyBeascuit, findElement,
} from '../gear';
import { BeascuitImage } from './BeascuitImage';
import { ToppingCircle } from './ToppingCircle';
import { LevellingPicker } from './LevellingPicker';

interface Props {
    cookie: Cookie;
    build: CookieBuild;
    onChange: (build: CookieBuild) => void;
    onClose: () => void;
}

export function CookieBuildEditor({ cookie, build, onChange, onClose }: Props) {
    // update part of the build
    const patch = (p: Partial<CookieBuild>) => onChange({ ...build, ...p });

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card build-editor" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
                <h2 style={{ marginBottom: 4 }}>{cookie.name}</h2>
                <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>Build customisation</p>

                {/* level and stars */}
                <LevellingPicker
                    rarity={cookie.rarity}
                    level={build.level}
                    ascension={build.ascension}
                    awakening={build.awakening}
                    idPrefix="ally"
                    onChange={patch}
                />

                {/* toppings */}
                <h3 style={{ margin: '24px 0 8px' }}>Toppings</h3>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ToppingCircle slots={build.toppings} tart={build.tart}
                        onChange={toppings => patch({ toppings })} />
                </div>

                {/* topping tart */}
                <h3 style={{ margin: '16px 0 8px' }}>Topping Tart</h3>
                <TartSlot tart={build.tart} onChange={tart => patch({ tart })} />

                {/* beascuit */}
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

// the single topping tart slot
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

// beascuit: pick the type, rarity and element, then its bonus effects
function BeascuitSelector({ cookieType, build, onChange }: {
    cookieType: string;
    build: CookieBuild;
    onChange: (b: CookieBuild['beascuit']) => void;
}) {
    const [picking, setPicking] = useState(false);
    const current = build.beascuit;

    function pick(key: string) {
        onChange(emptyBeascuit(key));
        setPicking(false);
    }

    // the rarity sets how many bonus effects there are, so dropping to a
    // lower rarity has to cut the extra ones off
    function setRarity(rarity: BeascuitRarity) {
        if (!current) return;
        const slots = BEASCUIT_BONUS_SLOTS[rarity];
        onChange({ ...current, rarity, substats: current.substats.slice(0, slots) });
    }

    // changing element invalidates any element DMG bonus already picked,
    // because a beascuit can only carry its own element's damage bonus
    function setElement(elementKey: string | null) {
        if (!current) return;
        const allowed = beascuitSubstatOptions(elementKey);
        onChange({
            ...current,
            element: elementKey,
            substats: current.substats.filter(s => allowed.includes(s)),
        });
    }

    function setSubstat(index: number, value: string) {
        if (!current) return;
        const next = [...current.substats];
        while (next.length <= index) next.push('');
        next[index] = value;
        onChange({ ...current, substats: next });
    }

    const slots = current ? BEASCUIT_BONUS_SLOTS[current.rarity] : 0;
    const options = current ? beascuitSubstatOptions(current.element) : [];
    const element = current ? findElement(current.element) : null;

    return (
        <>
            {current ? (
                <div className="beascuit-current">
                    <BeascuitImage
                        typeKey={current.key}
                        element={current.element}
                        anniversary={current.anniversary === true}
                        size={56}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: element ? element.color : 'var(--color-text)', fontWeight: 700 }}>
                            {beascuitName(current.key, current.rarity, current.element, current.anniversary)}
                        </div>
                        <button className="link-button" onClick={() => setPicking(true)}>Change</button>
                    </div>
                </div>
            ) : (
                <button className="pill" onClick={() => setPicking(true)}>Select a beascuit</button>
            )}

            {current && (
                <>
                    {/* rarity, which decides the number of bonus effects */}
                    <span className="field-label" style={{ marginTop: 14 }}>Rarity</span>
                    <div className="beascuit-option-row">
                        {BEASCUIT_RARITIES.map(r => (
                            <button
                                key={r}
                                className={'pill' + (current.rarity === r ? ' active' : '')}
                                onClick={() => setRarity(r)}
                            >
                                {r}
                                <span className="beascuit-slot-count">{BEASCUIT_BONUS_SLOTS[r]}</span>
                            </button>
                        ))}
                    </div>

                    {/* element, only on a tainted beascuit */}
                    <span className="field-label" style={{ marginTop: 14 }}>Element (tainted only)</span>
                    <div className="beascuit-option-row">
                        <button
                            className={'pill' + (current.element === null ? ' active' : '')}
                            onClick={() => setElement(null)}
                        >
                            None
                        </button>
                        {BEASCUIT_ELEMENTS.map(el => (
                            <button
                                key={el.key}
                                className={'pill' + (current.element === el.key ? ' active' : '')}
                                onClick={() => setElement(el.key)}
                                style={current.element === el.key ? undefined : { color: el.color }}
                            >
                                <span className="element-dot" style={{ background: el.color }} />
                                {el.name}
                            </button>
                        ))}
                    </div>

                    <label className="beascuit-anniversary">
                        <input
                            type="checkbox"
                            checked={current.anniversary === true}
                            onChange={e => onChange({ ...current, anniversary: e.target.checked })}
                        />
                        4th Anniversary version
                    </label>

                    {/* one dropdown per bonus slot */}
                    <span className="field-label" style={{ marginTop: 14 }}>
                        Bonus effects ({slots} slot{slots === 1 ? '' : 's'})
                    </span>
                    <div className="beascuit-substats">
                        {Array.from({ length: slots }, (_, i) => (
                            <select
                                key={i}
                                className="input"
                                value={current.substats[i] ?? ''}
                                onChange={e => setSubstat(i, e.target.value)}
                                aria-label={`Bonus effect ${i + 1}`}
                            >
                                <option value="">Empty</option>
                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ))}
                    </div>
                    {element && (
                        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                            Only an {element.adjective} beascuit can roll {element.name} DMG.
                        </p>
                    )}
                </>
            )}

            {/* the picker popup */}
            {picking && (
                <div className="modal-backdrop" onClick={() => setPicking(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <button className="modal-close" onClick={() => setPicking(false)} aria-label="Close"><X size={20} /></button>
                        <h2 style={{ marginBottom: 12 }}>Choose a beascuit</h2>
                        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                            Pick the type first. You set the rarity and element after.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {BEASCUITS.map(b => {
                                const fits = b.cookieType === cookieType;   // matches this cookie
                                return (
                                    <button key={b.key} className="beascuit-row" onClick={() => pick(b.key)}>
                                        <BeascuitImage typeKey={b.key} element={null} anniversary={false} size={44} />
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
