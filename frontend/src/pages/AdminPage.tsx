// ============================================================
// AdminPage.tsx - the staff panel, at /admin.
//
// What you can do depends on your role:
//
//   admin (moderator) - delete any community build
//   owner             - all of that, plus award titles, ban
//                       accounts, and make/unmake moderators
//
// Every button here is backed by a check on the SERVER against the
// role stored in the database. Hiding a button is only tidiness -
// somebody calling the API by hand still gets a 403. That's why
// the owner-only controls are safe even though the page itself is
// reachable by any moderator.
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield, Ban, CheckCircle2, Tag, Trash2, UserCog, AlertTriangle,
} from 'lucide-react';
import {
    AdminUser, PlayerBuild, Cookie, Role,
    getAllUsers, getTopBuilds, getCookies, deleteBuild,
    setUserTitle, setUserRole, setUserBanned,
} from '../api';
import { Avatar } from '../components/Avatar';
import { TitleBadge } from '../components/TitleBadge';
import { TeamRow } from '../components/TeamRow';
import { useAuth } from '../auth';

export function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const [tab, setTab] = useState<'users' | 'builds'>('users');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [builds, setBuilds] = useState<PlayerBuild[]>([]);
    const [roster, setRoster] = useState<Cookie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState<number | null>(null);

    const isOwner = user?.role === 'owner';
    const isStaff = isOwner || user?.role === 'admin';

    useEffect(() => {
        if (authLoading) return;
        if (!isStaff) { setLoading(false); return; }

        Promise.all([getAllUsers(), getTopBuilds(), getCookies()])
            .then(([u, b, c]) => { setUsers(u); setBuilds(b); setRoster(c); })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [authLoading, isStaff]);

    // ---- actions ----
    async function act<T>(id: number, run: () => Promise<T>, after: (result: T) => void) {
        setBusyId(id); setError('');
        try {
            after(await run());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'That did not work.');
        } finally {
            setBusyId(null);
        }
    }

    function handleTitle(target: AdminUser) {
        const next = window.prompt(
            `Title for ${target.username} (blank to clear):`, target.title ?? '');
        if (next === null) return;   // they cancelled
        act(target.user_id,
            () => setUserTitle(target.user_id, next.trim() || null),
            res => setUsers(list => list.map(u =>
                u.user_id === res.user_id ? { ...u, title: res.title } : u)));
    }

    function handleRole(target: AdminUser) {
        const next: Role = target.role === 'admin' ? 'user' : 'admin';
        const ok = window.confirm(next === 'admin'
            ? `Make ${target.username} a moderator? They'll be able to delete any build.`
            : `Remove ${target.username}'s moderator powers?`);
        if (!ok) return;
        act(target.user_id,
            () => setUserRole(target.user_id, next as 'user' | 'admin'),
            res => setUsers(list => list.map(u =>
                u.user_id === res.user_id ? { ...u, role: res.role } : u)));
    }

    function handleBan(target: AdminUser) {
        const banning = target.banned_at === null;
        let reason = '';
        if (banning) {
            const entered = window.prompt(
                `Ban ${target.username}? They keep their builds but can't log in.\n\nReason (optional):`, '');
            if (entered === null) return;
            reason = entered.trim();
        } else if (!window.confirm(`Un-ban ${target.username}?`)) {
            return;
        }
        act(target.user_id,
            () => setUserBanned(target.user_id, banning, reason),
            res => setUsers(list => list.map(u =>
                u.user_id === res.user_id
                    ? { ...u, banned_at: res.banned_at, ban_reason: res.ban_reason }
                    : u)));
    }

    function handleDeleteBuild(build: PlayerBuild) {
        const ok = window.confirm(
            `Delete ${build.username}'s "${build.counter_team[0]} Comp" build? This can't be undone.`);
        if (!ok) return;
        act(build.build_id,
            () => deleteBuild(build.build_id),
            () => setBuilds(list => list.filter(b => b.build_id !== build.build_id)));
    }

    // ---- not allowed in here ----
    if (authLoading || loading) {
        return <div className="skeleton" style={{ height: 200 }} />;
    }
    if (!isStaff) {
        return (
            <div>
                <h1 style={{ marginBottom: 16 }}>Admin panel</h1>
                <div className="card">
                    <p className="muted">
                        This page is for site staff only.{' '}
                        <Link to="/counter" className="username-link">Back to the Counter Tool</Link>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Shield size={26} aria-hidden="true" /> Admin panel
                <TitleBadge title={isOwner ? 'Owner' : 'Moderator'} />
            </h1>
            <p className="muted" style={{ marginBottom: 20 }}>
                {isOwner
                    ? 'You can moderate builds, award titles, ban accounts and appoint moderators.'
                    : 'You can delete any community build. Titles and bans are the owner’s job.'}
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                <button className={'pill' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')}>
                    <UserCog size={15} aria-hidden="true" /> Accounts ({users.length})
                </button>
                <button className={'pill' + (tab === 'builds' ? ' active' : '')} onClick={() => setTab('builds')}>
                    <Trash2 size={15} aria-hidden="true" /> Builds ({builds.length})
                </button>
            </div>

            {error && <div className="error-box" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

            {/* ---- ACCOUNTS ---- */}
            {tab === 'users' && (
                <div className="admin-list">
                    {users.map(u => (
                        <div key={u.user_id}
                            className={'card admin-row' + (u.banned_at ? ' is-banned' : '')}>
                            <Avatar who={u} username={u.username} size={42} />

                            <div className="admin-row-main">
                                <div className="admin-row-name">
                                    <Link to={`/u/${u.user_id}`} className="username-link">{u.username}</Link>
                                    <span className="muted admin-id">#{u.user_id}</span>
                                    <TitleBadge title={u.title} small />
                                    {u.role !== 'user' && (
                                        <span className="tag admin-tag">
                                            <Shield size={11} aria-hidden="true" />
                                            {u.role === 'owner' ? 'Owner' : 'Moderator'}
                                        </span>
                                    )}
                                </div>
                                <div className="muted" style={{ fontSize: 13 }}>
                                    {u.build_count} build{u.build_count === '1' ? '' : 's'}
                                    {u.banned_at && (
                                        <span className="admin-ban-note">
                                            <AlertTriangle size={12} aria-hidden="true" />
                                            Banned{u.ban_reason ? ` — ${u.ban_reason}` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Owner-only controls. An owner can't be
                                demoted or banned, so those are hidden too. */}
                            {isOwner && (
                                <div className="admin-row-actions">
                                    <button className="pill" disabled={busyId === u.user_id}
                                        onClick={() => handleTitle(u)}>
                                        <Tag size={14} aria-hidden="true" /> Title
                                    </button>
                                    {u.role !== 'owner' && (
                                        <>
                                            <button className="pill" disabled={busyId === u.user_id}
                                                onClick={() => handleRole(u)}>
                                                <Shield size={14} aria-hidden="true" />
                                                {u.role === 'admin' ? 'Remove mod' : 'Make mod'}
                                            </button>
                                            <button
                                                className={'pill' + (u.banned_at ? '' : ' danger')}
                                                disabled={busyId === u.user_id}
                                                onClick={() => handleBan(u)}>
                                                {u.banned_at
                                                    ? <><CheckCircle2 size={14} aria-hidden="true" /> Un-ban</>
                                                    : <><Ban size={14} aria-hidden="true" /> Ban</>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ---- BUILDS ---- */}
            {tab === 'builds' && (
                <div className="admin-list">
                    {builds.length === 0 && (
                        <div className="card"><p className="muted">There are no community builds yet.</p></div>
                    )}
                    {builds.map(b => (
                        <div key={b.build_id} className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                <Avatar who={b} username={b.username} size={30} />
                                <div style={{ flex: 1, minWidth: 140 }}>
                                    <strong style={{ color: 'var(--color-text)' }}>{b.counter_team[0]} Comp</strong>
                                    <div className="muted" style={{ fontSize: 13 }}>
                                        by{' '}
                                        <Link to={`/u/${b.user_id}`} className="username-link">{b.username}</Link>
                                        {' · '}{b.likes} like{b.likes === 1 ? '' : 's'}
                                    </div>
                                </div>
                                <button className="pill danger" disabled={busyId === b.build_id}
                                    onClick={() => handleDeleteBuild(b)}>
                                    <Trash2 size={14} aria-hidden="true" /> Delete
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <TeamRow label="VS." kind="enemy" cookieNames={b.opponent_team} allCookies={roster} />
                                <TeamRow label="USE" kind="ally" cookieNames={b.counter_team} allCookies={roster} />
                            </div>
                            {b.note && <p className="build-card-note">{b.note}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
