// ============================================================
// SettingsPage.tsx - real, working settings.
// - Account section: shows who you're logged in as + a logout
//   button, or a log-in button if you're signed out.
// - Accent colour: a working theme setting that changes the
//   whole site's highlight colour and is remembered next visit.
// ============================================================

import { useState } from 'react';
import { LogOut, User, Check } from 'lucide-react';
import { useAuth } from '../auth';
import { AuthModal } from '../components/AuthModal';
import { ACCENTS, getSavedAccent, applyAccent } from '../accent';

export function SettingsPage() {
    const { user, logout } = useAuth();
    const [showAuth, setShowAuth] = useState(false);
    const [accent, setAccent] = useState(getSavedAccent());

    function chooseAccent(key: string) {
        applyAccent(key);   // changes the CSS variables live
        setAccent(key);
    }

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>Settings</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>

                {/* ---- Account ---- */}
                <div className="card">
                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>Account</h2>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                            <div className="avatar"><User size={22} /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>
                                    {user.username}{user.isAdmin && <span className="tag" style={{ marginLeft: 8 }}>ADMIN</span>}
                                </div>
                                <div className="muted" style={{ fontSize: 14 }}>{user.email}</div>
                            </div>
                            <button className="pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={logout}>
                                <LogOut size={16} /> Log out
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <span className="muted">You're not logged in.</span>
                            <button className="btn-primary" onClick={() => setShowAuth(true)}>Log in / Sign up</button>
                        </div>
                    )}
                </div>

                {/* ---- Accent colour (a working setting) ---- */}
                <div className="card">
                    <h2 style={{ fontSize: 18, marginBottom: 6 }}>Accent colour</h2>
                    <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
                        Changes the site's highlight colour. Saved for next time.
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {ACCENTS.map(a => (
                            <button
                                key={a.key}
                                onClick={() => chooseAccent(a.key)}
                                title={a.label}
                                aria-label={a.label}
                                className="swatch"
                                style={{ background: a.primary, outline: accent === a.key ? '3px solid var(--color-text)' : 'none' }}
                            >
                                {accent === a.key && <Check size={18} color="#0b0d1a" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---- Read-only info rows (v1) ---- */}
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Theme</span>
                    <span className="muted">Dark Esports</span>
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    );
}
