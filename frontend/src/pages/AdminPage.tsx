// the staff panel, what shows depends on your title

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield, Ban, CheckCircle2, Trash2, UserCog, Search,
    AlertTriangle, Plus, X,
} from 'lucide-react';
import {
    StaffUser, PlayerBuild, Cookie, Title,
    getAllUsers, getBuilds, getCookies, deleteBuild,
    lookupUser, addUserTitle, removeUserTitle, setUserBanned,
} from '../api';
import { Avatar } from '../components/Avatar';
import { TitleBadges } from '../components/TitleBadge';
import { TeamRow } from '../components/TeamRow';
import { useAuth } from '../auth';

// ban lengths, null = permanent
const DURATIONS: { label: string; minutes: number | null }[] = [
    { label: '1 hour',   minutes: 60 },
    { label: '1 day',    minutes: 60 * 24 },
    { label: '7 days',   minutes: 60 * 24 * 7 },
    { label: '30 days',  minutes: 60 * 24 * 30 },
    { label: 'Permanent', minutes: null },
];

// the preset titles and their colours
const PRESET_TITLES: (Title & { adminAssignable?: boolean })[] = [
    { name: 'Owner',           color: '#000000' },
    { name: 'Admin',           color: '#22D3EE' },
    { name: 'Mod',             color: '#A78BFA', adminAssignable: true },
    { name: 'OG',              color: '#F0C24A', adminAssignable: true },
    { name: 'Content Creator', color: '#EF4444', adminAssignable: true },
];


export function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const isOwner = user?.role === 'owner';
    const isAdmin = user?.role === 'admin' || isOwner;
    const isStaff = isAdmin || user?.role === 'mod';

    const [tab, setTab] = useState<'accounts' | 'builds'>('accounts');
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [builds, setBuilds] = useState<PlayerBuild[]>([]);
    const [roster, setRoster] = useState<Cookie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading) return;
        if (!isStaff) { setLoading(false); return; }

        // mods can view accounts but not change them
        Promise.all([
            isAdmin ? getAllUsers() : Promise.resolve([]),
            getBuilds('likes'),
            getCookies(),
        ])
            .then(([u, b, c]) => { setUsers(u); setBuilds(b); setRoster(c); })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [authLoading, isStaff, isAdmin]);

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

    // label for the rank badge
    const rankLabel = isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Mod';

    // update one row without refetching
    const updateUser = (updated: Partial<StaffUser> & { user_id: number }) =>
        setUsers(list => list.map(u =>
            u.user_id === updated.user_id ? { ...u, ...updated } : u));

    return (
        <div>
            <h1 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Shield size={26} aria-hidden="true" /> Admin panel
                <span className="tag admin-tag">{rankLabel}</span>
            </h1>
            <p className="muted" style={{ marginBottom: 20 }}>
                {isOwner
                    ? 'You can moderate builds, award any title (custom or preset), ban accounts (with an IP ban option) and appoint moderators.'
                    : isAdmin
                        ? 'You can moderate builds, award the Mod / OG / Content Creator titles, and ban accounts. Custom titles are the owner\'s job.'
                        : 'You can delete any community build. Titles and bans are the admin team\'s job.'}
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                <button className={'pill' + (tab === 'accounts' ? ' active' : '')} onClick={() => setTab('accounts')}>
                    <UserCog size={15} aria-hidden="true" /> Accounts
                    <span className="group-count">{users.length}</span>
                </button>
                <button className={'pill' + (tab === 'builds' ? ' active' : '')} onClick={() => setTab('builds')}>
                    <Trash2 size={15} aria-hidden="true" /> Builds
                    <span className="group-count">{builds.length}</span>
                </button>
            </div>

            {error && <div className="error-box" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

            {/* accounts */}
            {tab === 'accounts' && isAdmin && (
                <>
                    <ManageAccountForm
                        onLookup={u => setUsers(list => {
                            const other = list.filter(x => x.user_id !== u.user_id);
                            // move to the top
                            return [{ ...u, build_count: '0' } as StaffUser, ...other];
                        })}
                        onDone={updateUser}
                        onError={setError}
                        isOwner={isOwner}
                    />

                    <div className="admin-list" style={{ marginTop: 22 }}>
                        {users.map(u => (
                            <AccountRow
                                key={u.user_id}
                                account={u}
                                actingUserId={user!.userId}
                                isOwner={isOwner}
                                onUpdate={updateUser}
                                onError={setError}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* builds */}
            {tab === 'builds' && (
                <div className="admin-list">
                    {builds.length === 0 && (
                        <div className="card"><p className="muted">There are no community builds yet.</p></div>
                    )}
                    {builds.map(b => (
                        <BuildAdminRow
                            key={b.build_id}
                            build={b}
                            roster={roster}
                            onDeleted={() => setBuilds(list => list.filter(x => x.build_id !== b.build_id))}
                            onError={setError}
                        />
                    ))}
                </div>
            )}

        </div>
    );
}


// look up an account by id or name, then act on it
function ManageAccountForm({ onLookup, onDone, onError, isOwner }: {
    onLookup: (u: StaffUser) => void;
    onDone: (u: Partial<StaffUser> & { user_id: number }) => void;
    onError: (msg: string) => void;
    isOwner: boolean;
}) {
    const [query, setQuery] = useState('');
    const [found, setFound] = useState<StaffUser | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleLookup() {
        if (!query.trim()) return;
        setBusy(true); onError('');
        try {
            const u = await lookupUser(query.trim());
            setFound(u);
            onLookup(u);
        } catch (err) {
            setFound(null);
            onError(err instanceof Error ? err.message : 'Lookup failed.');
        } finally { setBusy(false); }
    }

    return (
        <div className="card admin-manage">
            <h2 style={{ fontSize: 17, marginBottom: 10 }}>Manage account</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                Enter a user id (e.g. <code>7</code>) or a username to load their controls.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                    className="input"
                    style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                    placeholder="id or username"
                />
                <button className="btn-primary" disabled={busy} onClick={handleLookup}>
                    <Search size={16} aria-hidden="true" /> Find
                </button>
            </div>

            {found && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--color-border)' }}>
                    <ManageAccountControls
                        account={found}
                        onUpdated={next => { setFound({ ...found, ...next }); onDone({ ...next, user_id: found.user_id }); }}
                        onError={onError}
                        isOwner={isOwner}
                    />
                </div>
            )}
        </div>
    );
}


// one row in the accounts list
function AccountRow({ account, actingUserId, isOwner, onUpdate, onError }: {
    account: StaffUser;
    actingUserId: number;
    isOwner: boolean;
    onUpdate: (u: Partial<StaffUser> & { user_id: number }) => void;
    onError: (msg: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const isMe = account.user_id === actingUserId;
    const isBanned = account.banned_at !== null
        && (account.banned_until === null || new Date(account.banned_until) > new Date());

    return (
        <div className={'card admin-row' + (isBanned ? ' is-banned' : '')}>
            <div className="admin-row-summary">
                <Avatar who={account} username={account.username} size={42} />
                <div className="admin-row-main">
                    <div className="admin-row-name">
                        <Link to={`/u/${account.user_id}`} className="username-link">{account.username}</Link>
                        <span className="muted admin-id">#{account.user_id}</span>
                        <TitleBadges titles={account.titles} small />
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                        {account.build_count} build{account.build_count === '1' ? '' : 's'}
                        {account.last_ip && <> · last IP <code>{account.last_ip}</code></>}
                        {isBanned && (
                            <span className="admin-ban-note">
                                <AlertTriangle size={12} aria-hidden="true" />
                                Banned{account.ban_reason ? ` — ${account.ban_reason}` : ''}
                                {account.banned_until && <> until {new Date(account.banned_until).toLocaleDateString('en-AU')}</>}
                            </span>
                        )}
                    </div>
                </div>
                {!isMe && (
                    <button className="pill" onClick={() => setOpen(v => !v)}>
                        {open ? <><X size={14} aria-hidden="true" /> Close</>
                              : <><UserCog size={14} aria-hidden="true" /> Manage</>}
                    </button>
                )}
            </div>

            {open && !isMe && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                    <ManageAccountControls
                        account={account}
                        onUpdated={next => onUpdate({ ...next, user_id: account.user_id })}
                        onError={onError}
                        isOwner={isOwner}
                    />
                </div>
            )}
        </div>
    );
}


// the staff controls: titles and bans
function ManageAccountControls({ account, onUpdated, onError, isOwner }: {
    account: StaffUser;
    onUpdated: (patch: Partial<StaffUser>) => void;
    onError: (msg: string) => void;
    isOwner: boolean;
}) {
    const [busy, setBusy] = useState(false);
    const isBanned = account.banned_at !== null
        && (account.banned_until === null || new Date(account.banned_until) > new Date());

    // title picker
    const [customName, setCustomName] = useState('');
    const [customColor, setCustomColor] = useState('#8B7CF6');

    async function addTitle(name: string, color: string) {
        setBusy(true); onError('');
        try {
            const res = await addUserTitle(account.user_id, name, color);
            onUpdated({ titles: res.titles });
        } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't award that title.");
        } finally { setBusy(false); }
    }

    async function removeTitle(name: string) {
        setBusy(true); onError('');
        try {
            const res = await removeUserTitle(account.user_id, name);
            onUpdated({ titles: res.titles });
        } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't remove that title.");
        } finally { setBusy(false); }
    }

    // ban form
    const [banReason, setBanReason] = useState('');
    const [banMinutes, setBanMinutes] = useState<number | null>(60 * 24);
    const [customDays, setCustomDays] = useState('');
    const [ipBan, setIpBan] = useState(false);

    async function submitBan(banning: boolean) {
        setBusy(true); onError('');
        try {
            // a typed number overrides the preset
            const days = customDays.trim() ? Number(customDays.trim()) : NaN;
            const minutes = Number.isFinite(days) && days > 0 ? days * 24 * 60 : banMinutes;

            const res = await setUserBanned(account.user_id, {
                banned: banning,
                reason: banning ? banReason : undefined,
                minutes: banning ? minutes : null,
                ipBan: banning && ipBan,
            });
            onUpdated({
                banned_at: res.banned_at,
                banned_until: res.banned_until,
                ban_reason: res.ban_reason,
            });
            if (res.ipMessage) onError(res.ipMessage);
        } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't do that.");
        } finally { setBusy(false); }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* current titles */}
            <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Current titles</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {account.titles.length === 0 && <span className="muted">None</span>}
                    {account.titles.map(t => (
                        <span key={t.name} className="admin-title-chip"
                              style={{ color: t.color, borderColor: t.color }}>
                            {t.name}
                            <button
                                className="admin-title-chip-remove"
                                aria-label={`Remove ${t.name}`}
                                onClick={() => removeTitle(t.name)}
                                disabled={busy}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {/* add a title */}
            <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Add a preset title</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PRESET_TITLES.map(preset => {
                        // admins can't award staff titles
                        const allowed = isOwner || preset.adminAssignable === true;
                        return (
                            <button
                                key={preset.name}
                                className="admin-title-preset"
                                style={{ color: preset.color, borderColor: preset.color, opacity: allowed ? 1 : 0.35 }}
                                disabled={!allowed || busy}
                                onClick={() => addTitle(preset.name, preset.color)}
                                title={allowed ? `Award ${preset.name}` : 'Owner only'}
                            >
                                {preset.name}
                            </button>
                        );
                    })}
                </div>

                {isOwner && (
                    <div style={{ marginTop: 12 }}>
                        <div className="field-label" style={{ marginBottom: 6 }}>Or a custom title (owner only)</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                                type="color"
                                className="theme-swatch"
                                aria-label="Title colour"
                                value={customColor}
                                onChange={e => setCustomColor(e.target.value)}
                            />
                            <input
                                className="input"
                                style={{ maxWidth: 220 }}
                                value={customName}
                                maxLength={20}
                                onChange={e => setCustomName(e.target.value)}
                                placeholder="Title name"
                            />
                            <button className="pill" disabled={busy || !customName.trim()}
                                onClick={() => { addTitle(customName.trim(), customColor); setCustomName(''); }}>
                                <Plus size={13} aria-hidden="true" /> Add
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ban */}
            <div>
                <div className="field-label" style={{ marginBottom: 6 }}>
                    Ban {isBanned && <span className="muted">— currently banned</span>}
                </div>
                {!isBanned && (
                    <>
                        <input
                            className="input"
                            style={{ maxWidth: 420, marginBottom: 8 }}
                            value={banReason}
                            maxLength={200}
                            placeholder="Reason (optional)"
                            onChange={e => setBanReason(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {DURATIONS.map(d => (
                                <button key={d.label}
                                    className={'pill' + (banMinutes === d.minutes && !customDays ? ' active' : '')}
                                    onClick={() => { setBanMinutes(d.minutes); setCustomDays(''); }}>
                                    {d.label}
                                </button>
                            ))}
                            {/* wider so the placeholder fits */}
                            <input
                                className="input"
                                type="number"
                                min={1}
                                style={{ width: 170 }}
                                value={customDays}
                                placeholder="Custom (days)"
                                onChange={e => setCustomDays(e.target.value)}
                            />
                        </div>
                        {isOwner && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 10 }}>
                                <input type="checkbox" checked={ipBan}
                                    onChange={e => setIpBan(e.target.checked)} />
                                Also block the last IP they logged in from
                                {account.last_ip && <code>({account.last_ip})</code>}
                            </label>
                        )}
                        <button className="pill danger" disabled={busy} onClick={() => submitBan(true)}>
                            <Ban size={14} aria-hidden="true" /> Ban this account
                        </button>
                    </>
                )}
                {isBanned && (
                    <button className="pill" disabled={busy} onClick={() => submitBan(false)}>
                        <CheckCircle2 size={14} aria-hidden="true" /> Un-ban
                    </button>
                )}
            </div>
        </div>
    );
}


// one build in the builds tab
function BuildAdminRow({ build, roster, onDeleted, onError }: {
    build: PlayerBuild;
    roster: Cookie[];
    onDeleted: () => void;
    onError: (msg: string) => void;
}) {
    const [busy, setBusy] = useState(false);

    async function handleDelete() {
        const ok = window.confirm(
            `Delete ${build.username}'s "${build.counter_team[0]} Comp" build? This can't be undone.`);
        if (!ok) return;
        setBusy(true); onError('');
        try {
            await deleteBuild(build.build_id);
            onDeleted();
        } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't delete.");
        } finally { setBusy(false); }
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <Avatar who={build} username={build.username} size={30} />
                <div style={{ flex: 1, minWidth: 140 }}>
                    <strong style={{ color: 'var(--color-text)' }}>{build.counter_team[0]} Comp</strong>
                    <div className="muted" style={{ fontSize: 13 }}>
                        by <Link to={`/u/${build.user_id}`} className="username-link">{build.username}</Link>
                        {' · '}{build.likes} like{build.likes === 1 ? '' : 's'}
                    </div>
                </div>
                <button className="pill danger" disabled={busy} onClick={handleDelete}>
                    <Trash2 size={14} aria-hidden="true" /> Delete
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <TeamRow label="VS." kind="enemy" cookieNames={build.opponent_team} allCookies={roster} />
                <TeamRow label="USE" kind="ally" cookieNames={build.counter_team} allCookies={roster} />
            </div>
            {build.note && <p className="build-card-note">{build.note}</p>}
        </div>
    );
}
