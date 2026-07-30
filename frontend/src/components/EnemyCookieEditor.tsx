// ============================================================
// EnemyCookieEditor.tsx - the small popup for an ENEMY cookie.
//
// In-game you can only see an opponent cookie's level and
// ascension - NOT their toppings, tart or beascuit. So the enemy
// editor is deliberately limited to just those two things.
// (Contrast with CookieBuildEditor, which is the full build for
// your own cookies.)
// ============================================================

import { X, Star } from 'lucide-react';
import { Cookie, cookieImageUrl } from '../api';
import { EnemyInfo, ASCENSION_LEVELS, ascensionImageUrl } from '../gear';

interface Props {
    cookie: Cookie;
    info: EnemyInfo;
    onChange: (info: EnemyInfo) => void;
    onClose: () => void;
}

export function EnemyCookieEditor({ cookie, info, onChange, onClose }: Props) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <img src={cookieImageUrl(cookie.image_file)} alt={cookie.name} width={48} height={48} />
                    <h2>{cookie.name}</h2>
                </div>
                <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
                    You can only see an enemy's level and ascension in-game.
                </p>

                <label htmlFor="enemy-level" className="field-label">Level</label>
                <input id="enemy-level" className="input" type="number" min={1} max={90} style={{ width: 120, marginBottom: 18 }}
                    value={info.level} onChange={e => onChange({ ...info, level: Number(e.target.value) })} />

                <span className="field-label">Ascension</span>
                <div className="ascension-row">
                    {ASCENSION_LEVELS.map(lvl => (
                        <button key={lvl}
                            className={'ascension-btn' + (info.ascension === lvl ? ' active' : '')}
                            onClick={() => onChange({ ...info, ascension: lvl })}
                            title={lvl === 0 ? 'Not ascended' : `${lvl}A`}>
                            {lvl === 0
                                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={14} /> None</span>
                                : <img src={ascensionImageUrl(lvl)} alt={`${lvl}A`} height={20} />}
                        </button>
                    ))}
                </div>

                <button className="btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={onClose}>Done</button>
            </div>
        </div>
    );
}
