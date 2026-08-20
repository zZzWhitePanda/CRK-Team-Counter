// login state for the whole app

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    AuthUser, getToken, setToken, clearToken,
    getMe, login as apiLogin, signup as apiSignup, updateProfile,
} from './api';

interface AuthState {
    user: AuthUser | null;
    loading: boolean;          // checking saved token
    login: (email: string, password: string) => Promise<void>;
    signup: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    // change username / picture
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

    // load user from saved token
    useEffect(() => {
        if (!getToken()) { setLoading(false); return; }
        getMe()
            .then(res => setUser(res.user))
            .catch(() => clearToken())   // bad token
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
        // rename gives a new token
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

// auth hook
export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
