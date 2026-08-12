// ============================================================
// LevellingPicker.tsx - the level / ascension / awakening
// controls, shared by the ally build editor and the enemy info
// editor so both behave identically.
//
// There are TWO separate star systems in the game and they stack:
//
//   Ascension - every cookie, 1A to 5A, small star badges.
//   Awakening - ONLY Ancient and Beast cookies, up to 6, shown as
//               the big winged banner. Ancient and Beast use
//               different artwork for it.
//
// So a Beast cookie can be 5A ascended AND 6-star awakened at the
// same time; a normal Epic cookie only ever has the ascension row.
// ============================================================

import { Star } from 'lucide-react';
import {
    ASCENSION_LEVELS, AWAKENING_LEVELS, MAX_LEVEL,
    ascensionImageUrl, awakeningImageUrl, awakeningStyle,
} from '../gear';

interface Props {
    rarity: string;                // decides whether awakening shows
    level: number;
    ascension: number;
    awakening: number;
    onChange: (patch: { level?: number; ascension?: number; awakening?: number }) => void;
    idPrefix?: string;             // keeps <label for> unique when two are on screen
}

export function LevellingPicker({
    rarity, level, ascension, awakening, onChange, idPrefix = 'lv',
}: Props) {
    const style = awakeningStyle(rarity);

    return (
        <div className="levelling">
            {/* ---- Level ---- */}
            <div className="levelling-level">
                <label htmlFor={`${idPrefix}-level`} className="field-label">Level</label>
                <input
                    id={`${idPrefix}-level`}
                    className="input no-spinner"
                    type="number"
                    min={1}
                    max={MAX_LEVEL}
                    value={level}
                    onChange={e => {
                        // clamp so a typo can't save level 9999
                        const n = Number(e.target.value);
                        onChange({ level: Number.isFinite(n) ? Math.min(MAX_LEVEL, Math.max(1, n)) : 1 });
                    }}
                />
            </div>

            {/* ---- Ascension (every cookie) ---- */}
            <div className="levelling-track">
                <span className="field-label">Ascension</span>
                <div className="ascension-row">
                    {ASCENSION_LEVELS.map(lvl => (
                        <button
                            key={lvl}
                            className={'ascension-btn' + (ascension === lvl ? ' active' : '')}
                            onClick={() => onChange({ ascension: lvl })}
                            title={lvl === 0 ? 'Not ascended' : `${lvl}A`}
                        >
                            {lvl === 0
                                ? <span className="ascension-none"><Star size={13} /> None</span>
                                : <img src={ascensionImageUrl(lvl)} alt={`${lvl}A`} height={20} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* ---- Awakening (Ancient + Beast only) ---- */}
            {style && (
                <div className="levelling-track">
                    <span className="field-label">
                        Awakening
                        <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                            {rarity} cookies only
                        </span>
                    </span>
                    <div className="awakening-row">
                        {AWAKENING_LEVELS.map(lvl => (
                            <button
                                key={lvl}
                                className={'awakening-btn' + (awakening === lvl ? ' active' : '')}
                                onClick={() => onChange({ awakening: lvl })}
                                title={lvl === 0 ? 'Not awakened' : `${lvl} star awakening`}
                            >
                                {lvl === 0
                                    ? <span className="ascension-none"><Star size={13} /> None</span>
                                    : <img src={awakeningImageUrl(style, lvl)}
                                           alt={`${lvl} star`} height={26} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * The read-only version, for showing somebody else's build. Draws
 * whichever of the two badges the cookie actually has.
 */
export function LevellingBadges({ rarity, level, ascension, awakening, compact }: {
    rarity: string;
    level: number;
    ascension: number;
    awakening: number;
    compact?: boolean;
}) {
    const style = awakeningStyle(rarity);
    return (
        <span className={'levelling-badges' + (compact ? ' compact' : '')}>
            <span className="detail-level">Lv. {level}</span>
            {ascension > 0 && (
                <span className="detail-stars" title={`${ascension}A ascended`}>
                    <img src={ascensionImageUrl(ascension)} alt="" height={compact ? 14 : 16} />
                    {ascension}A
                </span>
            )}
            {style && awakening > 0 && (
                <span className="detail-stars" title={`${awakening} star awakening`}>
                    <img src={awakeningImageUrl(style, awakening)} alt=""
                         height={compact ? 16 : 20} />
                </span>
            )}
            {ascension === 0 && (!style || awakening === 0) && (
                <span className="muted" style={{ fontSize: 11 }}>Not ascended</span>
            )}
        </span>
    );
}
