// one community build in a list

import { Heart, Eye, EyeOff, Trash2, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cookie, PlayerBuild } from '../api';
import { TeamRow } from './TeamRow';
import { Avatar } from './Avatar';
import { TitleBadges } from './TitleBadge';

interface Props {
    build: PlayerBuild;
    roster: Cookie[];
    rank?: number;                                  // rank badge
    onOpen: () => void;
    onLike?: () => void;
    onTogglePrivacy?: () => void;                   // owner only
    onDelete?: () => void;                          // owner only
    busy?: boolean;                                 // saving
}

export function BuildCard({
    build, roster, rank, onOpen, onLike, onTogglePrivacy, onDelete, busy,
}: Props) {
    const isPrivate = build.is_public === false;

    return (
        <div
            className={'card card-interactive build-card' + (isPrivate ? ' is-private' : '')}
            onClick={onOpen}
            role="button"
            tabIndex={0}
            // keyboard users can open it too
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
            }}
        >
            <div className="build-card-head">
                {rank !== undefined && <span className="rank-badge">#{rank}</span>}
                <h3 style={{ flex: 1, minWidth: 0 }}>{build.counter_team[0]} Comp</h3>

                {isPrivate && (
                    <span className="tag private-tag">
                        <EyeOff size={12} aria-hidden="true" /> Private
                    </span>
                )}

                {typeof build.views === 'number' && build.views > 0 && (
                    <span className="build-views" title={`${build.views} views`}>
                        <BarChart2 size={14} aria-hidden="true" /> {build.views}
                    </span>
                )}

                {onLike && (
                    // stopPropagation stops the details popup opening
                    <button
                        className={'like-button' + (build.likedByMe ? ' liked' : '')}
                        onClick={e => { e.stopPropagation(); onLike(); }}
                        title={build.likedByMe ? 'Unlike' : 'Like'}
                    >
                        <Heart size={18} fill={build.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
                        {build.likes}
                    </button>
                )}
            </div>

            {/* the author, links to their profile */}
            <div className="build-card-byline">
                <Avatar who={build} username={build.username} size={24} />
                <Link
                    to={`/u/${build.user_id}`}
                    className="username-link"
                    onClick={e => e.stopPropagation()}
                >
                    {build.username}
                </Link>
                <TitleBadges titles={build.titles} small />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <TeamRow label="VS." kind="enemy" cookieNames={build.opponent_team} allCookies={roster} />
                <TeamRow label="USE" kind="ally" cookieNames={build.counter_team} allCookies={roster} />
            </div>

            {build.note && <p className="build-card-note">{build.note}</p>}

            {/* owner controls */}
            {(onTogglePrivacy || onDelete) && (
                <div className="build-card-actions" onClick={e => e.stopPropagation()}>
                    {onTogglePrivacy && (
                        <button className="pill" onClick={onTogglePrivacy} disabled={busy}>
                            {isPrivate
                                ? <><Eye size={14} aria-hidden="true" /> Make public</>
                                : <><EyeOff size={14} aria-hidden="true" /> Make private</>}
                        </button>
                    )}
                    {onDelete && (
                        <button className="pill danger" onClick={onDelete} disabled={busy}>
                            <Trash2 size={14} aria-hidden="true" /> Delete
                        </button>
                    )}
                </div>
            )}

            <span className="build-card-hint">Click for the full build</span>
        </div>
    );
}
