// ============================================================
// FollowListModal.tsx - the popup listing someone's followers,
// or the people they follow.
//
// Opened by clicking the follower / following counts on a profile.
// Every row links to that person's profile, so you can hop from
// one player to the next.
// ============================================================

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FollowUser, getFollowers, getFollowing } from '../api';
import { Avatar } from './Avatar';
import { TitleBadge } from './TitleBadge';

interface Props {
    userId: number;
    username: string;      // only for the heading
    kind: 'followers' | 'following';
    onClose: () => void;
}

export function FollowListModal({ userId, username, kind, onClose }: Props) {
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = kind === 'followers' ? getFollowers : getFollowing;
        load(userId)
            .then(res => setUsers(res.users))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId, kind]);

    const heading = kind === 'followers'
        ? `${username}'s followers`
        : `${username} is following`;

    const emptyText = kind === 'followers'
        ? 'Nobody is following them yet.'
        : "They aren't following anyone yet.";

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card follow-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>
                <h2 style={{ marginBottom: 16, paddingRight: 40 }}>{heading}</h2>

                {loading && <div className="skeleton" style={{ height: 120 }} />}
                {error && <div className="error-box" role="alert">{error}</div>}

                {!loading && !error && users.length === 0 && (
                    <p className="muted">{emptyText}</p>
                )}

                <div className="follow-list">
                    {users.map(u => (
                        <Link
                            key={u.user_id}
                            to={`/u/${u.user_id}`}
                            className="follow-row"
                            onClick={onClose}
                        >
                            <Avatar who={u} username={u.username} size={38} />
                            <span className="follow-row-name">{u.username}</span>
                            <TitleBadge title={u.title} small />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
