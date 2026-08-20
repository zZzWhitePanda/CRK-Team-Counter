// current theme, saved in browser and on the account

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Theme, applyTheme, loadLocalTheme, saveLocalTheme, normaliseTheme, DEFAULT_THEME } from './theme';
import { saveMyTheme } from './api';
import { useAuth } from './auth';

interface ThemeState {
    theme: Theme;
    // preview a theme
    setTheme: (theme: Theme) => void;
    // save a theme
    commitTheme: (theme: Theme) => void;
    resetTheme: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [theme, setThemeState] = useState<Theme>(() => loadLocalTheme());

    // account whose theme is already loaded
    const loadedFor = useRef<number | null>(null);

    // repaint on change
    useEffect(() => { applyTheme(theme); }, [theme]);

    // on login, use the account theme
    useEffect(() => {
        if (!user) { loadedFor.current = null; return; }
        if (loadedFor.current === user.userId) return;
        loadedFor.current = user.userId;

        if (user.theme) {
            const fromAccount = normaliseTheme(user.theme);
            setThemeState(fromAccount);
            saveLocalTheme(fromAccount);
        }
    }, [user]);

    // preview only
    function setTheme(next: Theme) {
        setThemeState(next);
    }

    // save
    function commitTheme(next: Theme) {
        setThemeState(next);
        saveLocalTheme(next);
        if (user) {
            // failing here is fine, local copy still works
            saveMyTheme(next).catch(() => {});
        }
    }

    function resetTheme() {
        commitTheme(DEFAULT_THEME);
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, commitTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeState {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
