// ============================================================
// App.tsx - the page frame: sidebar on the left, and the
// router swaps which page shows in the content area.
// "/" redirects to the Counter Tool since that's the main
// feature people come for.
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { CommunityBuildsPage } from './pages/CommunityBuildsPage';
import { CounterToolPage } from './pages/CounterToolPage';
import { CookiesPage } from './pages/CookiesPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar />
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
        </BrowserRouter>
    );
}
