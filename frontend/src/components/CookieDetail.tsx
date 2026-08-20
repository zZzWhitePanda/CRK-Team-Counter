// popup showing everything known about one cookie: its skill, element,
// the build the game recommends, and the community builds using it

import { useEffect, useState } from 'react';
import { X, Clock, Gem, Sparkles } from 'lucide-react';
import { Cookie, PlayerBuild, cookieImageUrl, getBuilds } from '../api';
import {
    TOPPINGS, BEASCUITS, BEASCUIT_ELEMENTS,
    toppingImageUrl, toppingBoardUrl, beascuitName,
} from '../gear';
import { BeascuitImage } from './BeascuitImage';
import { rarityColor } from '../cookieSort';
import { Avatar } from './Avatar';

interface Props {
    cookie: Cookie;
    onClose: () => void;
    onOpenBuild?: (build: PlayerBuild) => void;
}

export function CookieDetail({ cookie, onClose, onOpenBuild }: Props) {
    const [builds, setBuilds] = useState<PlayerBuild[] | null>(null);
    const accent = rarityColor(cookie.rarity);

    // the community builds that actually use this cookie
    useEffect(() => {
        let live = true;
        getBuilds('likes')
            .then(all => {
                if (!live) return;
                setBuilds(all.filter(b => b.counter_team.includes(cookie.name)).slice(0, 6));
            })
            .catch(() => { if (live) setBuilds([]); });
        return () => { live = false; };
    }, [cookie.name]);

    // esc closes it, like the other popups
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const elements = cookie.elements ?? [];
    const recommended = cookie.recommended_toppings ?? [];
    // the beascuit that matches this cookie's class
    const beascuit = BEASCUITS.find(b => b.cookieType === cookie.type);
    // the game suggests an elemental beascuit when the cookie has an element
    const suggestedElement = elements[0] ?? null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card cookie-detail" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

                {/* who they are */}
                <div className="cookie-detail-head" style={{ borderColor: accent }}>
                    <img src={cookieImageUrl(cookie.image_file)} alt={cookie.name}
                        width={104} height={104} className="cookie-detail-portrait" />
                    <div style={{ minWidth: 0 }}>
                        <h2 style={{ marginBottom: 4 }}>{cookie.name}</h2>
                        <div className="cookie-detail-tags">
                            <span className="tag" style={{ color: accent, borderColor: accent }}>{cookie.rarity}</span>
                            <span className="tag">{cookie.type}</span>
                            <span className="tag">{cookie.position}</span>
                            {elements.map(key => {
                                const element = BEASCUIT_ELEMENTS.find(e => e.key === key);
                                return (
                                    <span key={key} className="tag"
                                        style={element ? { color: element.color, borderColor: element.color } : undefined}>
                                        {element ? element.name : key}
                                    </span>
                                );
                            })}
                        </div>
                        {cookie.quote && <p className="cookie-detail-quote">“{cookie.quote}”</p>}
                    </div>
                </div>

                {/* the build the game itself suggests */}
                <h3 className="cookie-detail-section"><Sparkles size={15} aria-hidden="true" /> Recommended build</h3>
                <div className="cookie-detail-build">
                    <div className="cookie-detail-block">
                        <span className="detail-gear-label">Toppings</span>
                        {recommended.length > 0 ? (
                            <div className="cookie-detail-toppings">
                                <img className="cookie-detail-board" src={toppingBoardUrl(recommended[0])} alt="" />
                                <div className="cookie-detail-topping-list">
                                    {recommended.map(key => {
                                        const topping = TOPPINGS.find(t => t.key === key);
                                        if (!topping) return null;
                                        return (
                                            <span key={key} className="cookie-detail-topping" title={topping.name}>
                                                <img src={toppingImageUrl(key, false)} alt="" width={30} height={30} />
                                                <span>
                                                    {topping.name}
                                                    <small className="muted"> · {topping.primaryStat}</small>
                                                </span>
                                            </span>
                                        );
                                    })}
                                    <span className="muted" style={{ fontSize: 12 }}>
                                        {recommended.length === 1
                                            ? `5x ${TOPPINGS.find(t => t.key === recommended[0])?.name}, plus the matching Tart.`
                                            : 'Split your five slots between these, plus a matching Tart.'}
                                    </span>
                                </div>
                            </div>
                        ) : <span className="muted detail-none">The wiki has no recommended toppings for this cookie.</span>}
                    </div>

                    <div className="cookie-detail-block">
                        <span className="detail-gear-label">Beascuit</span>
                        {beascuit ? (
                            <span className="detail-beascuit">
                                <BeascuitImage typeKey={beascuit.key} element={suggestedElement} size={34} />
                                <span>
                                    {beascuitName(beascuit.key, 'Legendary', suggestedElement)}
                                    <span className="detail-substats">
                                        {suggestedElement
                                            ? <span>Roll {BEASCUIT_ELEMENTS.find(e => e.key === suggestedElement)?.name} DMG where you can</span>
                                            : <span>No element, so any bonus effect will do</span>}
                                    </span>
                                </span>
                            </span>
                        ) : <span className="muted detail-none">None</span>}
                    </div>
                </div>

                {/* the skill */}
                {cookie.skill_name && (
                    <>
                        <h3 className="cookie-detail-section">
                            Skill: {cookie.skill_name}
                            {cookie.skill_cooldown && (
                                <span className="cookie-detail-cooldown">
                                    <Clock size={13} aria-hidden="true" /> {cookie.skill_cooldown}s
                                </span>
                            )}
                        </h3>
                        <p className="cookie-detail-skill">{cookie.skill_description}</p>
                    </>
                )}

                {/* the bits from the wiki page */}
                {(cookie.traits || cookie.voice_actor) && (
                    <div className="cookie-detail-facts">
                        {cookie.traits && <span><strong>Traits</strong> {cookie.traits}</span>}
                        {cookie.voice_actor && <span><strong>Voice</strong> {cookie.voice_actor}</span>}
                    </div>
                )}

                {cookie.description && (
                    <>
                        <h3 className="cookie-detail-section">Story</h3>
                        <p className="cookie-detail-story">{cookie.description}</p>
                    </>
                )}

                {/* builds other players have posted with this cookie */}
                <h3 className="cookie-detail-section"><Gem size={15} aria-hidden="true" /> Community builds using {cookie.name}</h3>
                {builds === null && <div className="skeleton" style={{ height: 60 }} />}
                {builds !== null && builds.length === 0 && (
                    <p className="muted">Nobody has posted a build with this cookie yet.</p>
                )}
                <div className="cookie-detail-builds">
                    {(builds ?? []).map(build => (
                        <button key={build.build_id} className="cookie-detail-build-row"
                            onClick={() => onOpenBuild?.(build)}>
                            <Avatar who={build} username={build.username} size={26} />
                            <span className="cookie-detail-build-name">
                                {build.counter_team[0]} Comp
                                <small className="muted"> by {build.username}</small>
                            </span>
                            <span className="muted" style={{ fontSize: 12 }}>{build.likes} likes</span>
                        </button>
                    ))}
                </div>

                <p className="muted cookie-detail-source">
                    Cookie information from the Cookie Run: Kingdom Wiki. Artwork belongs to Devsisters.
                </p>
            </div>
        </div>
    );
}
