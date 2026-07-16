// ============================================================
// AuthModal.tsx - the log in / sign up popup.
// One component handles both: a toggle switches between "log in"
// and "sign up" mode. Shows errors near the form (not the top)
// and disables the button while it's working.
// ============================================================

import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../auth';

export function AuthModal({ onClose }: { onClose: () => void }) {
    const { login, signup } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await signup(username, email, password);
            }
            onClose();   // success - close the popup
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    }

    return (
        // the dark backdrop; clicking it closes the popup
        <div className="modal-backdrop" onClick={onClose}>
            {/* stopPropagation so clicking the card doesn't close it */}
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>

                <h2 style={{ marginBottom: 4 }}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
                <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
                    {mode === 'login'
                        ? 'Log in to submit builds and like teams.'
                        : 'Sign up to share your own counter teams.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {mode === 'signup' && (
                        <div>
                            <label htmlFor="au-username" className="field-label">Username</label>
                            <input
                                id="au-username"
                                className="input"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="ArenaGrinder"
                                autoComplete="username"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="au-email" className="field-label">Email</label>
                        <input
                            id="au-email"
                            className="input"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="au-password" className="field-label">Password</label>
                        <input
                            id="au-password"
                            className="input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                        />
                    </div>

                    {error && <div className="error-box" role="alert">{error}</div>}

                    <button className="btn-primary" type="submit" disabled={busy} style={{ marginTop: 4 }}>
                        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
                    </button>
                </form>

                {/* switch between the two modes */}
                <p style={{ marginTop: 18, fontSize: 14, textAlign: 'center' }} className="muted">
                    {mode === 'login' ? "No account yet? " : 'Already have an account? '}
                    <button
                        className="link-button"
                        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                    >
                        {mode === 'login' ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
