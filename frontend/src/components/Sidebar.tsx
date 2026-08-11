// ============================================================
// Sidebar.tsx - the navigation rail from the mockups.
// Desktop: fixed left column. Phone: becomes the bottom bar
// (that switch happens in theme.css with a media query).
// NavLink adds the "active" class by itself when its page is
// the one being shown, which gives the highlighted button.
//
// The Admin panel link only shows for staff. Non-staff players
// never see it because they can't do anything with it - the
// backend refuses their requests anyway.
// ============================================================

import { NavLink } from 'react-router-dom';
import { Gem, Swords, CircleUserRound, Settings, Shield } from 'lucide-react';
import { useAuth } from '../auth';

// Shadow Milk Cookie sits faded behind the site name, the way
// paimon.moe puts a character behind its logo. It's decorative
// only, so it's aria-hidden and the alt text is empty.
const HERO_IMAGE = (import.meta.env.VITE_API_URL ?? '') + '/images/brand/shadow-milk-hero.png';

// The regular pages, matching the mockup order and icons.
const LINKS = [
    { to: '/builds', label: 'Community Builds', icon: Gem },
    { to: '/counter', label: 'Counter Tool', icon: Swords },
    { to: '/cookies', label: 'Cookies', icon: CircleUserRound },
    { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const { user } = useAuth();
    const isStaff = user?.role === 'mod' || user?.role === 'admin' || user?.role === 'owner';

    return (
        <nav className="sidebar" aria-label="Main navigation">
            <div className="sidebar-logo">
                <img className="sidebar-hero" src={HERO_IMAGE} alt="" aria-hidden="true" />
                <span className="sidebar-logo-text">
                    CRK
                    <small>Team Builder</small>
                </span>
            </div>

            {LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => 'nav-button' + (isActive ? ' active' : '')}
                >
                    <Icon size={20} aria-hidden="true" />
                    {label}
                </NavLink>
            ))}

            {isStaff && (
                <NavLink
                    to="/admin"
                    className={({ isActive }) => 'nav-button nav-button-staff' + (isActive ? ' active' : '')}
                >
                    <Shield size={20} aria-hidden="true" />
                    Admin
                </NavLink>
            )}
        </nav>
    );
}
