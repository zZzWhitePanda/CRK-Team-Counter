// ============================================================
// EnemyCookieEditor.tsx - the small popup for an ENEMY cookie.
//
// In-game you can only see an opponent cookie's level, ascension
// and (for Ancient/Beast cookies) awakening - NOT their toppings,
// tart or beascuit. So the enemy editor is deliberately limited to
// those. Contrast with CookieBuildEditor, which is the full build
// for your own cookies.
// ============================================================

import { X } from 'lucide-react';
import { Cookie, cookieImageUrl } from '../api';
import { EnemyInfo } from '../gear';
import { LevellingPicker } from './LevellingPicker';

interface Props {
    cookie: Cookie;
    info: EnemyInfo;
    onChange: (info: EnemyInfo) => void;
    onClose: () => void;
}

export function EnemyCookieEditor({ cookie, info, onChange, onClose }: Props) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card enemy-editor" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, paddingRight: 36 }}>
                    <img src={cookieImageUrl(cookie.image_file)} alt={cookie.name} width={48} height={48} />
                    <h2>{cookie.name}</h2>
                </div>
                <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
                    You can only see an enemy's level and stars in-game.
                </p>

                <LevellingPicker
                    rarity={cookie.rarity}
                    level={info.level}
                    ascension={info.ascension}
                    awakening={info.awakening}
                    idPrefix="enemy"
                    onChange={patch => onChange({ ...info, ...patch })}
                />

                <button className="btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={onClose}>Done</button>
            </div>
        </div>
    );
}
