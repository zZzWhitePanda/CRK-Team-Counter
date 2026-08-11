// ============================================================
// ProfilePage.tsx - a player's profile, at /u/<user id>.
//
// The address uses the account NUMBER, not the name (the same way
// Roblox uses /users/<id>). That means changing your username
// never breaks a link somebody saved to your profile.
//
// EVERYONE has one and anyone can look at anyone's, which is why
// usernames are clickable all over Community Builds. A visitor
// sees the person's picture, when they joined, follower/following
// counts, build count and total likes, then the builds themselves.
//
// On YOUR OWN profile you also get:
//   - change your username (subject to a 3-day cooldown, since
//     your old name is held for you for 14 days)
//   - upload a profile picture
//   - flip each build between public and private
//   - delete a build
//   - a second tab for the builds you've LIKED
//
// Staff extras when viewing SOMEONE ELSE:
//   - Ban / un-ban button (admin+). Convenience only; the full
//     control lives in the admin panel at /admin.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Heart, Gem, Pencil, Check, Upload, Trash2,
    UserPlus, UserCheck, Ban, Clock,
} from 'lucide-react';
import {
    Cookie, PlayerBuild, Profile, avatarUrl,
    getCookies, getProfile, setBuildPrivacy, deleteBuild,
    toggleFollow, setUserBanned, getLikedBuilds,
} from '../api';
import { BuildCard } from '../components/BuildCard';
import { BuildDetail } from '../components/BuildDetail';
import { FollowListModal } from '../components/FollowListModal';
import { TitleBadges } from '../components/TitleBadge';
import { fileToAvatarDataUri } from '../avatarUpload';
import { useAuth } from '../auth';

// how a cooldown date is written out, e.g. "14 August 2026"
function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-AU',
        { day: 'numeric', month: 'long', year: 'numeric' });
}

type ProfileTab = 'builds' | 'likes';

export function ProfilePage() {
    const { userId = '' } = useParams();
    const { user, saveProfile } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [builds, setBuilds] = useState<PlayerBuild[]>([]);
    const [likedBuilds, setLikedBuilds] = useState<PlayerBuild[]>([]);
    const [roster, setRoster] = useState<Cookie[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [openBuild, setOpenBuild] = useState<PlayerBuild | null>(null);
    const [tab, setTab] = useState<ProfileTab>('builds');
    const [busyBuild, setBusyBuild] = useState<number | null>(null);

    // load the profile whenever the id in the address bar changes,
    // or when you log in/out (which changes what you're allowed to see)
    useEffect(() => {
        setLoading(true);
        setError('');
        Promise.all([getProfile(userId), getCookies()])
            .then(([res, cookies]) => {
                setProfile(res.profile);
                setBuilds(res.builds);
                setRoster(cookies);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId, user?.userId]);

    // load YOUR liked builds when it's your own profile.
    useEffect(() => {
        if (profile?.isMe) getLikedBuilds().then(setLikedBuilds).catch(() => {});
    }, [profile?.isMe]);

    // ---- owner actions ----
    async function handleTogglePrivacy(build: PlayerBuild) {
        setBusyBuild(build.build_id);
        try {
            const res = await setBuildPrivacy(build.build_id, build.is_public === false);
            setBuilds(prev => prev.map(b =>
                b.build_id === res.build_id ? { ...b, is_public: res.is_public } : b));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not change that build.');
        } finally {
            setBusyBuild(null);
        }
    }

    async function handleDelete(build: PlayerBuild) {
        const ok = window.confirm(
            `Delete your "${build.counter_team[0]} Comp" build? This can't be undone.`);
        if (!ok) return;

        setBusyBuild(build.build_id);
        try {
            await deleteBuild(build.build_id);
            setBuilds(prev => prev.filter(b => b.build_id !== build.build_id));
            setProfile(p => p && { ...p, buildCount: Math.max(0, p.buildCount - 1) });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete that build.');
        } finally {
            setBusyBuild(null);
        }
    }

    if (loading) {
        return (
            <div>
                <div className="skeleton" style={{ height: 180, marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 160 }} />
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div>
                <h1 style={{ marginBottom: 16 }}>Profile</h1>
                <div className="error-box" role="alert">{error}</div>
                <Link to="/builds" className="link-button" style={{ marginTop: 16, display: 'inline-block' }}>
                    ← Back to Community Builds
                </Link>
            </div>
        );
    }

    if (!profile) return null;

    // Which list is being shown right now.
    const shownBuilds = tab === 'likes' ? likedBuilds : builds;

    return (
        <div>
            {/* Big prominent banner when the account is banned. Their
                builds ALSO stay hidden from Community Builds while
                the ban is in place; both come back on un-ban. */}
            {profile.isBanned && <BannedBanner profile={profile} />}

            <ProfileHeader
                profile={profile}
                onSaved={updated => setProfile(p => p && { ...p, ...updated })}
                saveProfile={saveProfile}
            />

            {error && <div className="error-box" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

            {/* ---- tabs (only useful on your own profile, where you
                     also get a "liked builds" list) ---- */}
            <div style={{ display: 'flex', gap: 8, margin: '32px 0 16px', flexWrap: 'wrap' }}>
                <button
                    className={'pill' + (tab === 'builds' ? ' active' : '')}
                    onClick={() => setTab('builds')}
                >
                    <Gem size={14} aria-hidden="true" />
                    {profile.isMe ? 'Your builds' : `${profile.username}'s builds`}
                    <span className="group-count">{builds.length}</span>
                </button>
                {profile.isMe && (
                    <button
                        className={'pill' + (tab === 'likes' ? ' active' : '')}
                        onClick={() => setTab('likes')}
                    >
                        <Heart size={14} aria-hidden="true" />
                        Liked
                        <span className="group-count">{likedBuilds.length}</span>
                    </button>
                )}
            </div>

            {shownBuilds.length === 0 && (
                <div className="card">
                    <p className="muted">
                        {tab === 'likes'
                            ? "You haven't liked any builds yet."
                            : profile.isMe
                                ? <>You haven't posted any builds yet — <Link to="/builds" className="username-link">submit your first one</Link>.</>
                                : `${profile.username} hasn't posted any public builds yet.`}
                    </p>
                </div>
            )}

            {shownBuilds.map(build => (
                <BuildCard
                    key={build.build_id}
                    build={build}
                    roster={roster}
                    onOpen={() => setOpenBuild(build)}
                    onTogglePrivacy={profile.isMe && tab === 'builds' ? () => handleTogglePrivacy(build) : undefined}
                    onDelete={profile.isMe && tab === 'builds' ? () => handleDelete(build) : undefined}
                    busy={busyBuild === build.build_id}
                />
            ))}

            {openBuild && (
                <BuildDetail build={openBuild} roster={roster} onClose={() => setOpenBuild(null)} />
            )}
        </div>
    );
}

// ============================================================
// The banner at the top: picture, name, badges, stats, and the
// controls to change your name and picture (own profile) or
// follow / ban (other profiles).
// ============================================================
function ProfileHeader({ profile, onSaved, saveProfile }: {
    profile: Profile;
    onSaved: (updated: Partial<Profile>) => void;
    saveProfile: ReturnType<typeof useAuth>['saveProfile'];
}) {
    const { user } = useAuth();
    const [editingName, setEditingName] = useState(false);
    const [name, setName] = useState(profile.username);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [problem, setProblem] = useState('');
    const [showList, setShowList] = useState<'followers' | 'following' | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const picture = avatarUrl(profile);

    // Renaming: the 3-day cooldown comes from the logged-in user's
    // own record, so it only ever applies to your own profile.
    const renameBlockedUntil = profile.isMe ? (user?.usernameChangeableAt ?? null) : null;

    async function save(changes: Parameters<typeof saveProfile>[0], done: string) {
        setBusy(true); setProblem(''); setMessage('');
        try {
            const updated = await saveProfile(changes);
            onSaved({ username: updated.username, avatarData: updated.avatarData });
            setMessage(done);
            return true;
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not save that.');
            return false;
        } finally { setBusy(false); }
    }

    async function handleRename() {
        const trimmed = name.trim();
        if (trimmed === profile.username) { setEditingName(false); return; }
        if (trimmed.length < 3) { setProblem('Username must be at least 3 characters.'); return; }
        if (await save({ username: trimmed }, 'Username changed.')) {
            setEditingName(false);
        }
    }

    async function handleFollow() {
        if (!user) { setProblem('Log in to follow other players.'); return; }
        setBusy(true); setProblem('');
        try {
            const res = await toggleFollow(profile.userId);
            onSaved({ followedByMe: res.following, followers: res.followers });
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not do that.');
        } finally { setBusy(false); }
    }

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setProblem(''); setMessage('');
        try {
            const dataUri = await fileToAvatarDataUri(file);
            await save({ avatarData: dataUri }, 'Profile picture updated.');
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not read that image.');
        }
        if (fileInput.current) fileInput.current.value = '';
    }

    // ---- staff-only: ban/unban a person from their own profile ----
    // The full form (duration, IP, reason) is on the admin panel;
    // this is the "I'm looking at them anyway" convenience button.
    async function handleBan() {
        const banning = !profile.isBanned;
        const reason = banning
            ? window.prompt(`Ban ${profile.username}? Reason (optional):`, '') ?? undefined
            : undefined;
        if (banning && reason === undefined) return;   // they cancelled
        if (!banning && !window.confirm(`Un-ban ${profile.username}?`)) return;

        setBusy(true); setProblem('');
        try {
            const res = await setUserBanned(profile.userId, { banned: banning, reason });
            onSaved({ isBanned: res.banned_at !== null && (res.banned_until === null || new Date(res.banned_until) > new Date()) });
            setMessage(banning ? `${profile.username} has been banned.` : `${profile.username} has been un-banned.`);
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not do that.');
        } finally { setBusy(false); }
    }

    const joined = new Date(profile.createdAt).toLocaleDateString('en-AU',
        { day: 'numeric', month: 'long', year: 'numeric' });

    const canBan = !profile.isMe && (user?.role === 'admin' || user?.role === 'owner');

    return (
        <section className="card profile-header">
            {/* ---- picture ---- */}
            <div className="profile-picture-block">
                <div className="profile-picture">
                    {picture
                        ? <img src={picture} alt={`${profile.username}'s profile picture`} />
                        : <span>{profile.username[0]?.toUpperCase() ?? '?'}</span>}
                </div>

                {profile.isMe && (
                    <div className="profile-picture-actions">
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            style={{ display: 'none' }}
                            onChange={e => handleFile(e.target.files?.[0])}
                        />
                        <button className="pill" disabled={busy}
                            onClick={() => fileInput.current?.click()}>
                            <Upload size={14} aria-hidden="true" /> Upload
                        </button>
                        {picture && (
                            <button className="pill danger" disabled={busy}
                                onClick={() => save({ avatarData: null }, 'Profile picture removed.')}>
                                <Trash2 size={14} aria-hidden="true" /> Remove
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ---- name + badges + stats ---- */}
            <div className="profile-details">
                {editingName ? (
                    <div className="profile-name-edit">
                        <label htmlFor="profile-username" className="field-label">Username</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input
                                id="profile-username"
                                className="input"
                                style={{ maxWidth: 280 }}
                                value={name}
                                maxLength={30}
                                autoFocus
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
                            />
                            <button className="btn-primary" onClick={handleRename} disabled={busy}>
                                <Check size={16} aria-hidden="true" /> Save
                            </button>
                            <button className="btn-ghost" disabled={busy}
                                onClick={() => { setName(profile.username); setEditingName(false); setProblem(''); }}>
                                Cancel
                            </button>
                        </div>
                        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                            You can change your name once every 3 days. Your old name is held for you for 14 days.
                        </p>
                    </div>
                ) : (
                    <div className="profile-name-row">
                        <h1 className="profile-name">{profile.username}</h1>
                        <TitleBadges titles={profile.titles} />
                        {profile.isBanned && (
                            <span className="tag banned-tag" title="This account is banned">
                                <Ban size={12} aria-hidden="true" /> Banned
                            </span>
                        )}
                        {profile.isMe && (
                            renameBlockedUntil
                                ? <span className="rename-locked" title="Usernames can only change every 3 days">
                                    <Clock size={13} aria-hidden="true" />
                                    Rename available {formatDate(renameBlockedUntil)}
                                  </span>
                                : <button className="profile-edit-button" onClick={() => setEditingName(true)}>
                                    <Pencil size={13} aria-hidden="true" /> Change
                                  </button>
                        )}
                    </div>
                )}

                <p className="muted" style={{ marginTop: 4 }}>Joined {joined}</p>

                {!profile.isMe && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                        <button
                            className={'follow-button' + (profile.followedByMe ? ' following' : '')}
                            onClick={handleFollow}
                            disabled={busy}
                            title={user ? undefined : 'Log in to follow'}
                        >
                            {profile.followedByMe
                                ? <><UserCheck size={16} aria-hidden="true" /> Following</>
                                : <><UserPlus size={16} aria-hidden="true" /> Follow</>}
                        </button>
                        {canBan && (
                            <button className={'pill' + (profile.isBanned ? '' : ' danger')}
                                    disabled={busy} onClick={handleBan}>
                                <Ban size={14} aria-hidden="true" />
                                {profile.isBanned ? 'Un-ban' : 'Ban'}
                            </button>
                        )}
                    </div>
                )}

                <div className="profile-stats">
                    <button className="profile-stat clickable" onClick={() => setShowList('followers')}>
                        <strong>{profile.followers}</strong> follower{profile.followers === 1 ? '' : 's'}
                    </button>
                    <button className="profile-stat clickable" onClick={() => setShowList('following')}>
                        <strong>{profile.following}</strong> following
                    </button>
                    <span className="profile-stat">
                        <Gem size={16} aria-hidden="true" />
                        <strong>{profile.buildCount}</strong> public build{profile.buildCount === 1 ? '' : 's'}
                    </span>
                    <span className="profile-stat">
                        <Heart size={16} aria-hidden="true" />
                        <strong>{profile.totalLikes}</strong> like{profile.totalLikes === 1 ? '' : 's'}
                    </span>
                </div>

                {message && <p className="profile-message">{message}</p>}
                {problem && <div className="error-box" role="alert" style={{ marginTop: 12 }}>{problem}</div>}
            </div>

            {showList && (
                <FollowListModal
                    userId={profile.userId}
                    username={profile.username}
                    kind={showList}
                    onClose={() => setShowList(null)}
                />
            )}
        </section>
    );
}


// ============================================================
// The big red banner at the top of a banned account's profile.
// Everything else on the profile stays there because the ban
// might be lifted later - only the banner and the community
// listing are affected by the current ban state.
// ============================================================
function BannedBanner({ profile }: { profile: Profile }) {
    // Ban expiry as a friendly string. The banner shows the *date*
    // when it lifts, not seconds-until - "24 August 2026" reads
    // more clearly than "in 13 days".
    const until = profile.bannedUntil
        ? new Date(profile.bannedUntil).toLocaleDateString('en-AU',
            { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="profile-banned-banner" role="alert">
            <div className="profile-banned-banner-icon" aria-hidden="true">
                <Ban size={30} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
                <div className="profile-banned-banner-title">
                    Account banned
                </div>
                <p style={{ marginTop: 4, fontSize: 14 }}>
                    {profile.username} isn't allowed to log in right now, and their
                    community builds have been taken down.
                    {until
                        ? <> The ban lifts on <strong>{until}</strong>.</>
                        : <> This ban is permanent unless an admin lifts it.</>}
                </p>
                {profile.banReason && (
                    <p style={{ marginTop: 6, fontSize: 14 }}>
                        <strong>Reason:</strong> {profile.banReason}
                    </p>
                )}
            </div>
        </div>
    );
}
