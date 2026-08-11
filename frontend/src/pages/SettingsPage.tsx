// ============================================================
// SettingsPage.tsx - the account and appearance settings.
//
// The old version only changed one highlight colour. This one
// changes the site's real colours: pick a ready-made theme, build
// your own, add a background picture, and keep your own themes to
// switch between later.
//
// Saved themes live on the ACCOUNT, so they follow you to another
// computer. A copy is kept in the browser too, so the site paints
// in your colours immediately instead of flashing the default
// while it waits for the server.
// ============================================================

import { useEffect, useState } from 'react';
import { LogOut, Check, Palette, Plus, Trash2, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { useTheme } from '../themeContext';
import { AuthModal } from '../components/AuthModal';
import { Avatar } from '../components/Avatar';
import { ThemeEditor } from '../components/ThemeEditor';
import { TitleBadges } from '../components/TitleBadge';
import { PRESET_THEMES, Theme, normaliseTheme } from '../theme';
import {
    SavedTheme, getMyThemes, saveThemePreset, deleteThemePreset,
} from '../api';

export function SettingsPage() {
    const { user, logout } = useAuth();
    const { theme, setTheme, commitTheme } = useTheme();
    const [showAuth, setShowAuth] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState<SavedTheme[]>([]);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState('');
    const [message, setMessage] = useState('');

    // load this account's saved themes
    useEffect(() => {
        if (!user) { setSaved([]); return; }
        getMyThemes().then(setSaved).catch(() => {});
    }, [user]);

    async function handleSaveTheme(next: Theme, name: string) {
        commitTheme(next);          // use it now, and remember it
        setEditing(false);
        setProblem(''); setMessage('');

        if (!user) {
            setMessage('Theme applied. Log in if you want to keep it on your account.');
            return;
        }
        setBusy(true);
        try {
            const preset = await saveThemePreset(name, next);
            // replace it in the list if the name already existed
            setSaved(list => [preset, ...list.filter(t => t.theme_id !== preset.theme_id)]);
            setMessage(`Saved "${name}" to your themes.`);
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not save that theme.');
        } finally {
            setBusy(false);
        }
    }

    async function handleDeleteTheme(preset: SavedTheme) {
        if (!window.confirm(`Delete your "${preset.name}" theme?`)) return;
        try {
            await deleteThemePreset(preset.theme_id);
            setSaved(list => list.filter(t => t.theme_id !== preset.theme_id));
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not delete that theme.');
        }
    }

    const isStaff = user?.role === 'admin' || user?.role === 'owner';

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>Settings</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>

                {/* ---- Account ---- */}
                <div className="card">
                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>Account</h2>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                            <Avatar who={user} username={user.username} size={48} />
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ color: 'var(--color-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <Link to={`/u/${user.userId}`} className="username-link">{user.username}</Link>
                                    <TitleBadges titles={user.titles} small />
                                </div>
                                <div className="muted" style={{ fontSize: 14 }}>{user.email}</div>
                            </div>
                            {isStaff && (
                                <Link to="/admin" className="pill">
                                    <Shield size={15} aria-hidden="true" /> Admin panel
                                </Link>
                            )}
                            <button className="pill" onClick={logout}>
                                <LogOut size={16} aria-hidden="true" /> Log out
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <span className="muted">You're not logged in.</span>
                            <button className="btn-primary" onClick={() => setShowAuth(true)}>Log in / Sign up</button>
                        </div>
                    )}
                </div>

                {/* ---- Ready-made themes ---- */}
                <div className="card">
                    <h2 style={{ fontSize: 18, marginBottom: 6 }}>Theme</h2>
                    <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
                        Pick one of these, or make your own below.
                        {user
                            ? ' Your choice is saved to your account.'
                            : ' Your choice is saved in this browser — log in to keep it on your account.'}
                    </p>

                    <div className="theme-grid">
                        {PRESET_THEMES.map(preset => (
                            <ThemeCard
                                key={preset.name}
                                theme={preset}
                                selected={theme.name === preset.name && !theme.custom}
                                onPick={() => { commitTheme(preset); setMessage(''); }}
                            />
                        ))}
                    </div>
                </div>

                {/* ---- Your own themes ---- */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h2 style={{ fontSize: 18 }}>Your themes</h2>
                        {!editing && (
                            <button className="pill" onClick={() => setEditing(true)}>
                                <Plus size={15} aria-hidden="true" /> Make a theme
                            </button>
                        )}
                    </div>
                    <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
                        Pick your own colours and add a background image.
                    </p>

                    {saved.length > 0 && (
                        <div className="theme-grid" style={{ marginBottom: editing ? 20 : 0 }}>
                            {saved.map(preset => {
                                const asTheme = normaliseTheme(preset.theme);
                                return (
                                    <ThemeCard
                                        key={preset.theme_id}
                                        theme={asTheme}
                                        selected={theme.name === asTheme.name && theme.custom === true}
                                        onPick={() => { commitTheme(asTheme); setMessage(''); }}
                                        onDelete={() => handleDeleteTheme(preset)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {saved.length === 0 && !editing && (
                        <p className="muted" style={{ fontSize: 14 }}>
                            {user
                                ? "You haven't made any themes yet."
                                : 'Log in to keep your own themes.'}
                        </p>
                    )}

                    {editing && (
                        <ThemeEditor
                            theme={theme}
                            onPreview={setTheme}
                            onSave={handleSaveTheme}
                            onCancel={() => setEditing(false)}
                            busy={busy}
                        />
                    )}

                    {message && <p className="profile-message">{message}</p>}
                    {problem && <div className="error-box" role="alert" style={{ marginTop: 12 }}>{problem}</div>}
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    );
}

// ---- one theme in the grid: a little preview of its colours ----
function ThemeCard({ theme, selected, onPick, onDelete }: {
    theme: Theme;
    selected: boolean;
    onPick: () => void;
    onDelete?: () => void;
}) {
    return (
        <div className={'theme-card' + (selected ? ' selected' : '')}>
            <button className="theme-card-main" onClick={onPick} title={`Use ${theme.name}`}>
                {/* a miniature of the page: background, a card on it,
                    and an accent button - so you can see what you get */}
                <span className="theme-preview" style={{ background: theme.colors.background }}>
                    {theme.backgroundImage && (
                        <span className="theme-preview-image"
                            style={{
                                backgroundImage: `url("${theme.backgroundImage}")`,
                                opacity: theme.backgroundOpacity,
                            }} />
                    )}
                    <span className="theme-preview-card" style={{ background: theme.colors.surface }}>
                        <span className="theme-preview-line" style={{ background: theme.colors.text }} />
                        <span className="theme-preview-line short" style={{ background: theme.colors.text, opacity: 0.5 }} />
                        <span className="theme-preview-button" style={{ background: theme.colors.accent }} />
                    </span>
                </span>

                <span className="theme-card-name">
                    {theme.name}
                    {selected && <Check size={15} aria-hidden="true" />}
                </span>
            </button>

            {onDelete && (
                <button className="theme-card-delete" onClick={onDelete}
                    aria-label={`Delete ${theme.name}`} title="Delete this theme">
                    <Trash2 size={14} />
                </button>
            )}
            {!onDelete && theme.custom && (
                <span className="theme-card-badge"><Palette size={12} aria-hidden="true" /></span>
            )}
        </div>
    );
}
