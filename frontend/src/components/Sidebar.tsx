// ============================================================
// Sidebar.tsx - the navigation rail from the mockups.
// Desktop: fixed left column. Phone: becomes the bottom bar
// (that switch happens in theme.css with a media query).
// NavLink adds the "active" class by itself when its page is
// the one being shown, which gives the highlighted button.
// ============================================================

import { NavLink } from 'react-router-dom';
import { Gem, Swords, CircleUserRound, Settings } from 'lucide-react';

// the 4 pages, matching the mockup order and icons
const links = [
    { to: '/builds', label: 'Community Builds', icon: Gem },
    { to: '/counter', label: 'Counter Tool', icon: Swords },
    { to: '/cookies', label: 'Cookies', icon: CircleUserRound },
    { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    return (
        <nav className="sidebar" aria-label="Main navigation">
            <div className="sidebar-logo">
                CRK
                <small>Team Builder</small>
            </div>

            {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => 'nav-button' + (isActive ? ' active' : '')}
                >
                    {/* aria-hidden: the text label already says what it is */}
                    <Icon size={20} aria-hidden="true" />
                    {label}
                </NavLink>
            ))}
        </nav>
    );
}
