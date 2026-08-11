// ============================================================
// BuildDetail.tsx - the popup you get when you click a community
// build. The card in the list only shows the two teams; this shows
// EVERYTHING the person saved with it:
//
//   your team   -> level, ascension stars, 5 toppings + their
//                  bonus stats, the topping tart, the beascuit
//   enemy team  -> level and ascension (all you can see in-game)
//   both teams  -> their 3 treasures
//
// It reads the saved JSON through readBuildDetails() so a build
// posted before those details existed still opens, just with a
// note saying the details weren't recorded.
// ============================================================

import { X, Heart, Gem } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cookie, PlayerBuild, cookieImageUrl } from '../api';
import {
    BEASCUITS, TOPPINGS, TREASURES,
    ascensionImageUrl, beascuitImageUrl, toppingImageUrl, treasureImageUrl,
} from '../gear';
import { readBuildDetails, DetailedCookieBuild, DetailedEnemyInfo } from '../buildDetails';
import { rarityColor } from '../cookieSort';
import { Avatar } from './Avatar';

interface Props {
    build: PlayerBuild;
    roster: Cookie[];
    onClose: () => void;
    onLike?: () => void;
}

// look-ups by key, so a saved key becomes a readable name + picture
const toppingByKey = (key: string) => TOPPINGS.find(t => t.key === key);
const beascuitByKey = (key: string) => BEASCUITS.find(b => b.key === key);
const treasureByKey = (key: string) => TREASURES.find(t => t.key === key);

export function BuildDetail({ build, roster, onClose, onLike }: Props) {
    const details = readBuildDetails(build.gear_setup);
    const findCookie = (name: string) => roster.find(c => c.name === name);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card detail-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>

                {/* ---- who made it ---- */}
                <h2 style={{ marginBottom: 6, paddingRight: 40 }}>
                    {build.counter_team[0]} Comp
                </h2>
                <div className="detail-byline">
                    <Avatar who={build} username={build.username} size={28} />
                    <Link to={`/u/${build.user_id}`} className="username-link">
                        {build.username}
                    </Link>
                    {onLike && (
                        <button
                            className={'like-button' + (build.likedByMe ? ' liked' : '')}
                            onClick={onLike}
                            style={{ marginLeft: 'auto' }}
                        >
                            <Heart size={18} fill={build.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
                            {build.likes}
                        </button>
                    )}
                </div>

                {build.note && <p className="detail-note">{build.note}</p>}

                {!details.hasDetails && (
                    <p className="muted" style={{ marginTop: 16 }}>
                        This build was posted without the extra details (toppings,
                        beascuits and treasures), so only the teams are shown.
                    </p>
                )}

                {/* ---- the enemy team ---- */}
                <section className="detail-section">
                    <h3 className="detail-heading" style={{ color: 'var(--color-enemy)' }}>
                        Enemy team
                    </h3>
                    <div className="detail-cookie-row">
                        {build.opponent_team.map(name => (
                            <EnemyCard
                                key={name}
                                name={name}
                                cookie={findCookie(name)}
                                info={details.enemyInfo.find(e => e.cookie === name)}
                            />
                        ))}
                    </div>
                    <TreasureRow keys={details.enemyTreasures} color="var(--color-enemy)" label="Enemy treasures" />
                </section>

                {/* ---- the counter team, with full builds ---- */}
                <section className="detail-section">
                    <h3 className="detail-heading" style={{ color: 'var(--color-ally)' }}>
                        Counter team
                    </h3>
                    <div className="detail-build-list">
                        {build.counter_team.map(name => (
                            <AllyCard
                                key={name}
                                name={name}
                                cookie={findCookie(name)}
                                build={details.yourBuilds.find(b => b.cookie === name)}
                            />
                        ))}
                    </div>
                    <TreasureRow keys={details.yourTreasures} color="var(--color-ally)" label="Your treasures" />
                </section>
            </div>
        </div>
    );
}

// ---- one enemy cookie: portrait + level + stars ----------------
function EnemyCard({ name, cookie, info }: {
    name: string; cookie?: Cookie; info?: DetailedEnemyInfo;
}) {
    return (
        <div className="detail-cookie" style={{ borderColor: 'var(--color-enemy)' }}>
            {cookie && (
                <img src={cookieImageUrl(cookie.image_file)} alt={name}
                    width={56} height={56} loading="lazy" />
            )}
            <span className="detail-cookie-name">{name}</span>
            {info ? (
                <>
                    <span className="detail-level">Lv. {info.level}</span>
                    <AscensionStars level={info.ascension} />
                </>
            ) : (
                <span className="muted" style={{ fontSize: 11 }}>no details</span>
            )}
        </div>
    );
}

// ---- one of YOUR cookies: the whole build -----------------------
function AllyCard({ name, cookie, build }: {
    name: string; cookie?: Cookie; build?: DetailedCookieBuild;
}) {
    const accent = cookie ? rarityColor(cookie.rarity) : 'var(--color-ally)';
    const beascuit = build?.beascuit ? beascuitByKey(build.beascuit.key) : null;
    const tart = build?.tart ? toppingByKey(build.tart) : null;

    return (
        <div className="detail-build" style={{ borderLeftColor: accent }}>
            {/* who it is */}
            <div className="detail-build-head">
                {cookie && (
                    <img src={cookieImageUrl(cookie.image_file)} alt={name}
                        width={52} height={52} loading="lazy" />
                )}
                <div style={{ minWidth: 0 }}>
                    <div className="detail-build-name">{name}</div>
                    {build ? (
                        <div className="detail-build-sub">
                            <span className="detail-level">Lv. {build.level}</span>
                            <AscensionStars level={build.ascension} />
                        </div>
                    ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No build details saved</div>
                    )}
                </div>
            </div>

            {build && (
                <div className="detail-gear">
                    {/* the 5 toppings */}
                    <div className="detail-gear-block">
                        <span className="detail-gear-label">Toppings</span>
                        <div className="detail-topping-row">
                            {build.toppings.map((slot, i) => {
                                const topping = slot ? toppingByKey(slot.toppingKey) : null;
                                if (!slot || !topping) {
                                    return <span key={i} className="detail-slot empty" title="Empty slot" />;
                                }
                                return (
                                    <span key={i} className="detail-slot" title={topping.name}>
                                        <img src={toppingImageUrl(slot.toppingKey, slot.isTart)}
                                            alt={topping.name} width={30} height={30} loading="lazy" />
                                        {slot.substats.length > 0 && (
                                            <span className="detail-substats">
                                                {slot.substats.map((s, j) => (
                                                    <span key={j}>{s.stat} +{s.value}</span>
                                                ))}
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* the single topping tart */}
                    <div className="detail-gear-block">
                        <span className="detail-gear-label">Tart</span>
                        {tart ? (
                            <span className="detail-slot" title={tart.name}>
                                <img src={toppingImageUrl(tart.key, true)} alt={tart.name}
                                    width={30} height={30} loading="lazy" />
                            </span>
                        ) : <span className="muted detail-none">None</span>}
                    </div>

                    {/* the beascuit + its stats */}
                    <div className="detail-gear-block">
                        <span className="detail-gear-label">Beascuit</span>
                        {beascuit && build.beascuit ? (
                            <span className="detail-beascuit" title={beascuit.name}>
                                <img src={beascuitImageUrl(beascuit.key)} alt={beascuit.name}
                                    width={30} height={30} loading="lazy" />
                                <span>
                                    {beascuit.name}
                                    {build.beascuit.stats.length > 0 && (
                                        <span className="detail-substats">
                                            {build.beascuit.stats.map((s, j) => (
                                                <span key={j}>{s.stat} +{s.value}</span>
                                            ))}
                                        </span>
                                    )}
                                </span>
                            </span>
                        ) : <span className="muted detail-none">None</span>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- the ascension stars (1A - 5A), or nothing at 0 -------------
function AscensionStars({ level }: { level: number }) {
    if (!level) return <span className="muted" style={{ fontSize: 11 }}>Not ascended</span>;
    return (
        <span className="detail-stars" title={`${level}A ascended`}>
            <img src={ascensionImageUrl(level)} alt={`${level} ascension`}
                height={16} loading="lazy" />
            {level}A
        </span>
    );
}

// ---- a team's 3 treasures --------------------------------------
function TreasureRow({ keys, color, label }: { keys: string[]; color: string; label: string }) {
    if (keys.length === 0) return null;
    return (
        <div className="detail-treasures">
            <span className="detail-gear-label" style={{ color }}>
                <Gem size={13} aria-hidden="true" /> {label}
            </span>
            <div className="detail-treasure-row">
                {keys.map(key => {
                    const treasure = treasureByKey(key);
                    return (
                        <span key={key} className="detail-treasure" title={treasure?.name ?? key}>
                            <img src={treasureImageUrl(key)} alt={treasure?.name ?? key}
                                width={34} height={34} loading="lazy" />
                            <span>{treasure?.name ?? key}</span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
