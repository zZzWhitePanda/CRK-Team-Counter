// ============================================================
// auth.tsx - keeps track of who is logged in, for the whole app.
//
// React "context" lets any page read the current user without
// passing it down through every component. Any component can call
// useAuth() to get { user, login, signup, logout }.
//
// On first load, if we have a saved token, we ask the backend
// "who am I" so the user stays logged in after a refresh.
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    AuthUser, getToken, setToken, clearToken,
    getMe, login as apiLogin, signup as apiSignup, updateProfile,
} from './api';

interface AuthState {
    user: AuthUser | null;
    loading: boolean;          // true while we check the saved token
    login: (email: string, password: string) => Promise<void>;
    signup: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    // used by the profile page to change your username / picture.
    // It lives here (not in the page) so the name and picture in the
    // top bar update straight away, without a refresh.
    saveProfile: (changes: {
        username?: string;
        avatar?: string | null;
        avatarData?: string | null;
    }) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // on startup, if there's a saved token, fetch the user
    useEffect(() => {
        if (!getToken()) { setLoading(false); return; }
        getMe()
            .then(res => setUser(res.user))
            .catch(() => clearToken())   // token expired/invalid
            .finally(() => setLoading(false));
    }, []);

    async function login(email: string, password: string) {
        const res = await apiLogin({ email, password });
        setToken(res.token);
        setUser(res.user);
    }

    async function signup(username: string, email: string, password: string) {
        const res = await apiSignup({ username, email, password });
        setToken(res.token);
        setUser(res.user);
    }

    function logout() {
        clearToken();
        setUser(null);
    }

    async function saveProfile(changes: {
        username?: string; avatar?: string | null; avatarData?: string | null;
    }) {
        const res = await updateProfile(changes);
        // the username is baked into the login token, so a rename
        // hands back a new one that has to replace the old
        setToken(res.token);
        setUser(res.user);
        return res.user;
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, saveProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

// the hook every component uses to read/act on auth
export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
