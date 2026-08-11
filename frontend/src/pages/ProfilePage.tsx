// ============================================================
// ProfilePage.tsx - a player's profile, at /u/<user id>.
//
// The address uses the account NUMBER, not the name (the same way
// Roblox uses /users/<id>). That means changing your username
// never breaks a link somebody saved to your profile.
//
// EVERYONE has one and anyone can look at anyone's, which is why
// usernames are clickable all over the Community Builds page.
// A visitor sees the player's picture, when they joined, how many
// builds they've posted and how many likes those builds have,
// followed by the builds themselves.
//
// On YOUR OWN profile you also get:
//   - change your username
//   - change your profile picture (upload one, or pick a cookie)
//   - flip each build between public and private
//   - delete a build
// The backend decides who owns what (profile.isMe); this page just
// shows or hides the controls to match.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Heart, Gem, Pencil, Check, Upload, Trash2, Shield,
    UserPlus, UserCheck, Tag, Ban,
} from 'lucide-react';
import {
    Cookie, PlayerBuild, Profile, avatarUrl,
    getCookies, getProfile, setBuildPrivacy, deleteBuild,
    toggleFollow, setUserTitle,
} from '../api';
import { BuildCard } from '../components/BuildCard';
import { BuildDetail } from '../components/BuildDetail';
import { CookiePicker } from '../components/CookiePicker';
import { FollowListModal } from '../components/FollowListModal';
import { TitleBadge } from '../components/TitleBadge';
import { fileToAvatarDataUri } from '../avatarUpload';
import { useAuth } from '../auth';

export function ProfilePage() {
    const { userId = '' } = useParams();
    const { user, saveProfile } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [builds, setBuilds] = useState<PlayerBuild[]>([]);
    const [roster, setRoster] = useState<Cookie[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [openBuild, setOpenBuild] = useState<PlayerBuild | null>(null);

    // load the profile whenever the name in the address bar changes,
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
        // user?.userId rather than user: the user OBJECT is replaced
        // on every profile save, which would re-run this every time.
        // Only actually logging in or out should reload the page.
    }, [userId, user?.userId]);

    // ---- owner actions ----
    const [busyBuild, setBusyBuild] = useState<number | null>(null);

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
        // deleting can't be undone, so always ask first
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

    return (
        <div>
            <ProfileHeader
                profile={profile}
                roster={roster}
                onSaved={updated => setProfile(p => p && { ...p, ...updated })}
                saveProfile={saveProfile}
            />

            {error && <div className="error-box" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

            <h2 style={{ margin: '32px 0 16px' }}>
                {profile.isMe ? 'Your builds' : `${profile.username}'s builds`}
                <span className="muted group-count">{builds.length}</span>
            </h2>

            {builds.length === 0 && (
                <div className="card">
                    <p className="muted">
                        {profile.isMe
                            ? <>You haven’t posted any builds yet — <Link to="/builds" className="username-link">submit your first one</Link>.</>
                            : `${profile.username} hasn’t posted any public builds yet.`}
                    </p>
                </div>
            )}

            {builds.map(build => (
                <BuildCard
                    key={build.build_id}
                    build={build}
                    roster={roster}
                    onOpen={() => setOpenBuild(build)}
                    onTogglePrivacy={profile.isMe ? () => handleTogglePrivacy(build) : undefined}
                    onDelete={profile.isMe ? () => handleDelete(build) : undefined}
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
// The banner at the top: picture, name, stats, and - on your own
// profile - the controls to change your name and picture.
// ============================================================
function ProfileHeader({ profile, roster, onSaved, saveProfile }: {
    profile: Profile;
    roster: Cookie[];
    onSaved: (updated: Partial<Profile>) => void;
    saveProfile: ReturnType<typeof useAuth>['saveProfile'];
}) {
    const { user } = useAuth();
    const [editingName, setEditingName] = useState(false);
    const [name, setName] = useState(profile.username);
    const [pickingCookie, setPickingCookie] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [problem, setProblem] = useState('');
    // which follow list popup is open, if any
    const [showList, setShowList] = useState<'followers' | 'following' | null>(null);
    // the admin's title box
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(profile.title ?? '');
    const fileInput = useRef<HTMLInputElement>(null);

    const picture = avatarUrl(profile);


    // small wrapper so every save handles errors the same way
    async function save(changes: Parameters<typeof saveProfile>[0], done: string) {
        setBusy(true); setProblem(''); setMessage('');
        try {
            const updated = await saveProfile(changes);
            onSaved({
                username: updated.username,
                avatar: updated.avatar,
                avatarData: updated.avatarData,
            });
            setMessage(done);
            return true;
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not save that.');
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function handleRename() {
        const trimmed = name.trim();
        if (trimmed === profile.username) { setEditingName(false); return; }
        if (trimmed.length < 3) { setProblem('Username must be at least 3 characters.'); return; }
        // No navigation needed any more: the profile lives at
        // /u/<id>, which doesn't change when the name does. That's
        // the whole reason for using ids in the address.
        if (await save({ username: trimmed }, 'Username changed.')) {
            setEditingName(false);
        }
    }

    // ---- follow / unfollow ----
    async function handleFollow() {
        if (!user) { setProblem('Log in to follow other players.'); return; }
        setBusy(true); setProblem('');
        try {
            const res = await toggleFollow(profile.userId);
            onSaved({ followedByMe: res.following, followers: res.followers });
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not do that.');
        } finally {
            setBusy(false);
        }
    }

    // ---- award / clear a title (admins only) ----
    async function handleTitle() {
        setBusy(true); setProblem(''); setMessage('');
        try {
            const res = await setUserTitle(profile.userId, titleDraft.trim() || null);
            onSaved({ title: res.title });
            setEditingTitle(false);
            setMessage(res.title ? `Title set to "${res.title}".` : 'Title cleared.');
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not set that title.');
        } finally {
            setBusy(false);
        }
    }

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setProblem(''); setMessage('');
        try {
            // shrink it in the browser first - see avatarUpload.ts
            const dataUri = await fileToAvatarDataUri(file);
            await save({ avatarData: dataUri }, 'Profile picture updated.');
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not read that image.');
        }
        if (fileInput.current) fileInput.current.value = '';   // let the same file be picked again
    }

    const joined = new Date(profile.createdAt).toLocaleDateString('en-AU',
        { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <section className="card profile-header">
            {/* ---- the picture ---- */}
            <div className="profile-picture-block">
                <div className="profile-picture">
                    {picture
                        ? <img src={picture} alt={`${profile.username}'s profile picture`} />
                        : <span>{profile.username[0]?.toUpperCase() ?? '?'}</span>}
                </div>

                {profile.isMe && (
                    <div className="profile-picture-actions">
                        {/* the real file input is hidden - the button below
                            opens it, which looks far better than the browser's
                            default "Choose file" control */}
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
                        <button className="pill" disabled={busy}
                            onClick={() => setPickingCookie(true)}>
                            <Gem size={14} aria-hidden="true" /> Use a cookie
                        </button>
                        {picture && (
                            <button className="pill danger" disabled={busy}
                                onClick={() => save({ avatar: null, avatarData: null }, 'Profile picture removed.')}>
                                <Trash2 size={14} aria-hidden="true" /> Remove
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ---- name + stats ---- */}
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
                    </div>
                ) : (
                    <div className="profile-name-row">
                        <h1 className="profile-name">{profile.username}</h1>
                        <TitleBadge title={profile.title} />
                        {profile.isAdmin && (
                            <span className="tag admin-tag" title="Site admin">
                                <Shield size={12} aria-hidden="true" /> Admin
                            </span>
                        )}
                        {profile.isBanned && (
                            <span className="tag banned-tag" title="This account is banned">
                                <Ban size={12} aria-hidden="true" /> Banned
                            </span>
                        )}
                        {/* Renaming is unrestricted: the profile lives at
                            /u/<id>, so a new name never breaks a link. */}
                        {profile.isMe && (
                            <button className="profile-edit-button" onClick={() => setEditingName(true)}>
                                <Pencil size={13} aria-hidden="true" /> Change
                            </button>
                        )}
                    </div>
                )}

                <p className="muted" style={{ marginTop: 4 }}>Joined {joined}</p>

                {/* ---- follow button (not on your own profile) ---- */}
                {!profile.isMe && (
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
                )}

                <div className="profile-stats">
                    {/* the follow counts open a list of those people */}
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

                {/* ---- admin-only: award a title ----
                    This only HIDES the control from everyone else.
                    The real protection is on the backend, which checks
                    the admin flag in the database and returns 403. */}
                {profile.viewerRole === 'owner' && (
                    <div className="title-admin">
                        {editingTitle ? (
                            <div className="title-admin-edit">
                                <label htmlFor="profile-title" className="field-label">
                                    Title for {profile.username}
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input
                                        id="profile-title"
                                        className="input"
                                        style={{ maxWidth: 200 }}
                                        value={titleDraft}
                                        maxLength={20}
                                        placeholder="e.g. OG"
                                        autoFocus
                                        onChange={e => setTitleDraft(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleTitle(); }}
                                    />
                                    <button className="btn-primary" onClick={handleTitle} disabled={busy}>
                                        <Check size={16} aria-hidden="true" /> Save
                                    </button>
                                    <button className="btn-ghost" disabled={busy}
                                        onClick={() => { setTitleDraft(profile.title ?? ''); setEditingTitle(false); }}>
                                        Cancel
                                    </button>
                                </div>
                                {/* quick picks, so common titles are one click */}
                                <div className="title-presets">
                                    {['Owner', 'Admin', 'Mod', 'OG', 'Veteran', 'Legend'].map(t => (
                                        <button key={t} className="pill" onClick={() => setTitleDraft(t)}>{t}</button>
                                    ))}
                                    <button className="pill danger" onClick={() => setTitleDraft('')}>Clear</button>
                                </div>
                            </div>
                        ) : (
                            <button className="pill" onClick={() => setEditingTitle(true)}>
                                <Tag size={14} aria-hidden="true" />
                                {profile.title ? 'Change title' : 'Give a title'}
                            </button>
                        )}
                    </div>
                )}

                {message && <p className="profile-message">{message}</p>}
                {problem && <div className="error-box" role="alert" style={{ marginTop: 12 }}>{problem}</div>}
            </div>

            {/* the followers / following list popup */}
            {showList && (
                <FollowListModal
                    userId={profile.userId}
                    username={profile.username}
                    kind={showList}
                    onClose={() => setShowList(null)}
                />
            )}

            {/* choosing a cookie portrait re-uses the roster picker */}
            {pickingCookie && (
                <CookiePicker
                    roster={roster}
                    selectedName=""
                    disabledNames={[]}
                    startOpen
                    onPick={cookieName => {
                        const cookie = roster.find(c => c.name === cookieName);
                        setPickingCookie(false);
                        if (cookie) save({ avatar: cookie.image_file }, 'Profile picture updated.');
                    }}
                    onClear={() => setPickingCookie(false)}
                    onClose={() => setPickingCookie(false)}
                />
            )}
        </section>
    );
}
