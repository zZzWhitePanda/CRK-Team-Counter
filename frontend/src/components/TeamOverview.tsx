// a summary of the whole team's builds

import { Gem } from 'lucide-react';
import { Cookie, cookieImageUrl } from '../api';
import {
    CookieBuild, TeamTreasures, TOPPINGS, BEASCUITS, TREASURES,
    toppingImageUrl, treasureImageUrl, toppingBoardUrl, beascuitName,
} from '../gear';
import { BeascuitImage } from './BeascuitImage';
import { LevellingBadges } from './LevellingPicker';

interface Props {
    // cookie names in team order, '' if empty
    team: string[];
    builds: CookieBuild[];
    roster: Cookie[];
    treasures: TeamTreasures;
    onEdit?: (index: number) => void;
}

export function TeamOverview({ team, builds, roster, treasures, onEdit }: Props) {
    // slots with a cookie in them
    const filled = team
        .map((name, i) => ({ name, index: i }))
        .filter(s => s.name);

    if (filled.length === 0) return null;

    const equippedTreasures = treasures.filter(Boolean) as string[];

    return (
        <section className="team-overview">
            <h3 className="team-overview-title">Your team at a glance</h3>

            <div className="team-overview-grid">
                {filled.map(({ name, index }) => {
                    const cookie = roster.find(c => c.name === name);
                    const build = builds[index];
                    return (
                        <OverviewCard
                            key={name}
                            name={name}
                            cookie={cookie}
                            build={build}
                            onEdit={onEdit ? () => onEdit(index) : undefined}
                        />
                    );
                })}
            </div>

            {equippedTreasures.length > 0 && (
                <div className="team-overview-treasures">
                    <span className="detail-gear-label">
                        <Gem size={13} aria-hidden="true" /> Treasures
                    </span>
                    <div className="detail-treasure-row">
                        {equippedTreasures.map(key => {
                            const t = TREASURES.find(x => x.key === key);
                            return (
                                <span key={key} className="detail-treasure" title={t?.name ?? key}>
                                    <img src={treasureImageUrl(key)} alt={t?.name ?? key}
                                         width={30} height={30} loading="lazy" />
                                    <span>{t?.name ?? key}</span>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

// one cookie's summary
function OverviewCard({ name, cookie, build, onEdit }: {
    name: string;
    cookie?: Cookie;
    build?: CookieBuild;
    onEdit?: () => void;
}) {
    const toppings = build?.toppings ?? [];
    const filledToppings = toppings.filter(Boolean).length;
    const beascuit = build?.beascuit ? BEASCUITS.find(b => b.key === build.beascuit!.key) : null;
    const tart = build?.tart ? TOPPINGS.find(t => t.key === build.tart) : null;

    // nothing set on this cookie yet
    const untouched = filledToppings === 0 && !tart && !beascuit;

    return (
        <div className="overview-card">
            <div className="overview-card-head">
                {cookie && (
                    <img src={cookieImageUrl(cookie.image_file)} alt=""
                         width={44} height={44} loading="lazy" />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="overview-card-name">{name}</div>
                    {build && (
                        <LevellingBadges
                            rarity={cookie?.rarity ?? ''}
                            level={build.level}
                            ascension={build.ascension}
                            awakening={build.awakening}
                            compact
                        />
                    )}
                </div>
            </div>

            {untouched ? (
                <p className="overview-empty">
                    No gear set{onEdit && <> — <button className="link-button" onClick={onEdit}>add some</button></>}
                </p>
            ) : (
                <div className="overview-gear">
                    {/* the star board with the toppings on it */}
                    <span className="overview-board" title={
                        tart ? `${tart.name} Tart` : 'No Topping Tart'
                    }>
                        <img className="overview-board-star" src={toppingBoardUrl(build?.tart ?? null)} alt="" />
                    </span>

                    <div className="overview-gear-right">
                        <div className="overview-toppings">
                            {toppings.map((slot, i) =>
                                slot ? (
                                    <img key={i}
                                         src={toppingImageUrl(slot.toppingKey, slot.isTart)}
                                         alt=""
                                         title={TOPPINGS.find(t => t.key === slot.toppingKey)?.name}
                                         width={26} height={26} loading="lazy" />
                                ) : (
                                    <span key={i} className="overview-topping-empty" />
                                )
                            )}
                        </div>

                        <div className="overview-tags">
                            {tart && (
                                <span className="overview-tag" title={`${tart.name} Topping Tart`}>
                                    <img src={toppingImageUrl(tart.key, true)} alt="" width={16} height={16} />
                                    {tart.name}
                                </span>
                            )}
                            {beascuit && build?.beascuit && (
                                <span className="overview-tag" title={beascuitName(
                                    build.beascuit.key, build.beascuit.rarity,
                                    build.beascuit.element, build.beascuit.anniversary)}>
                                    <BeascuitImage typeKey={build.beascuit.key} element={build.beascuit.element}
                                        anniversary={build.beascuit.anniversary === true} size={16} />
                                    {beascuit.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
