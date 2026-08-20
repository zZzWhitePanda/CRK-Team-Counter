// level, ascension and awakening controls

import { Star } from 'lucide-react';
import {
    ASCENSION_LEVELS, AWAKENING_LEVELS, MAX_LEVEL,
    ascensionImageUrl, awakeningImageUrl, awakeningStyle,
} from '../gear';

interface Props {
    rarity: string;                // awakening only shows for some
    level: number;
    ascension: number;
    awakening: number;
    onChange: (patch: { level?: number; ascension?: number; awakening?: number }) => void;
    idPrefix?: string;             // keeps label ids unique
}

export function LevellingPicker({
    rarity, level, ascension, awakening, onChange, idPrefix = 'lv',
}: Props) {
    const style = awakeningStyle(rarity);

    return (
        <div className="levelling">
            {/* level */}
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
                        // clamp so typos can't go out of range
                        const n = Number(e.target.value);
                        onChange({ level: Number.isFinite(n) ? Math.min(MAX_LEVEL, Math.max(1, n)) : 1 });
                    }}
                />
            </div>

            {/* ascension */}
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

            {/* awakening, Ancient and Beast only */}
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

// read-only badges, for viewing someone else's build
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
