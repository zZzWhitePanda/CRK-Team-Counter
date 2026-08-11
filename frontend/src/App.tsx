// ============================================================
// App.tsx - the page frame: sidebar on the left, a top bar with
// the login button, and the router swaps which page shows in the
// content area. "/" redirects to the Counter Tool since that's
// the main feature people come for.
//
// The top bar's username is a LINK to your own profile (/u/<name>),
// which is how you get to the profile section. Everybody's profile
// lives at the same kind of address, so clicking someone's name on
// a community build lands you on exactly the same page.
// ============================================================

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { Avatar } from './components/Avatar';
import { CommunityBuildsPage } from './pages/CommunityBuildsPage';
import { CounterToolPage } from './pages/CounterToolPage';
import { CookiesPage } from './pages/CookiesPage';
import { ProfilePage } from './pages/ProfilePage';
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
                                <Link
                                    to={`/u/${encodeURIComponent(user.username)}`}
                                    className="topbar-profile-link"
                                    title="Your profile"
                                >
                                    <Avatar who={user} username={user.username} size={30} />
                                    <span>{user.username}</span>
                                </Link>
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
                            {/* anyone's profile - your own is just the one
                                where the username happens to be yours */}
                            <Route path="/u/:username" element={<ProfilePage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Routes>
                    </main>
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </BrowserRouter>
    );
}
