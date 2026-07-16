// ============================================================
// App.tsx - the page frame: sidebar on the left, a top bar with
// the login button, and the router swaps which page shows in the
// content area. "/" redirects to the Counter Tool since that's
// the main feature people come for.
// ============================================================

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LogIn, User } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { CommunityBuildsPage } from './pages/CommunityBuildsPage';
import { CounterToolPage } from './pages/CounterToolPage';
import { CookiesPage } from './pages/CookiesPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './auth';

export function App() {
    const { user, logout } = useAuth();
    const [showAuth, setShowAuth] = useState(false);

    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar />
                <div className="main-column">
                    {/* top bar: shows who's logged in, or a log-in button */}
                    <header className="topbar">
                        {user ? (
                            <div className="topbar-user">
                                <div className="avatar-sm"><User size={16} /></div>
                                <span>{user.username}</span>
                                <button className="link-button" onClick={logout}>Log out</button>
                            </div>
                        ) : (
                            <button className="btn-ghost" onClick={() => setShowAuth(true)}>
                                <LogIn size={16} /> Log in
                            </button>
                        )}
                    </header>

                    <main className="content">
                        <Routes>
                            <Route path="/" element={<Navigate to="/counter" replace />} />
                            <Route path="/builds" element={<CommunityBuildsPage />} />
                            <Route path="/counter" element={<CounterToolPage />} />
                            <Route path="/cookies" element={<CookiesPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Routes>
                    </main>
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </BrowserRouter>
    );
}
