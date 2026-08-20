// page layout and routing

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
import { AdminPage } from './pages/AdminPage';
import { ToppingDemoPage } from './pages/ToppingDemoPage';
import { useAuth } from './auth';

export function App() {
    const { user, logout } = useAuth();
    const [showAuth, setShowAuth] = useState(false);

    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar />
                <div className="main-column">
                    {/* top bar */}
                    <header className="topbar">
                        {user ? (
                            <div className="topbar-user">
                                <Link
                                    to={`/u/${user.userId}`}
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
                            {/* profile by user id, not name */}
                            <Route path="/u/:userId" element={<ProfilePage />} />
                            <Route path="/admin" element={<AdminPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/topping-demo" element={<ToppingDemoPage />} />
                        </Routes>
                    </main>
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </BrowserRouter>
    );
}
