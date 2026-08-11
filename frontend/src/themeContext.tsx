// ============================================================
// themeContext.tsx - holds the theme the site is currently using
// and keeps the browser copy and the account copy in step.
//
// WHY BOTH COPIES?
// The theme has to be applied before anything is painted, or the
// page flashes the default colours while it waits for the server.
// So it's kept in localStorage for speed AND on the account so it
// follows you to another computer. On login the account's theme
// wins, because that's the one you deliberately saved.
// ============================================================

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Theme, applyTheme, loadLocalTheme, saveLocalTheme, normaliseTheme, DEFAULT_THEME } from './theme';
import { saveMyTheme } from './api';
import { useAuth } from './auth';

interface ThemeState {
    theme: Theme;
    // change the theme right now (used live by the editor's preview)
    setTheme: (theme: Theme) => void;
    // change it AND remember it - in the browser, and on the account
    // if somebody is logged in
    commitTheme: (theme: Theme) => void;
    resetTheme: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [theme, setThemeState] = useState<Theme>(() => loadLocalTheme());

    // Which account's theme we've already loaded. Without this the
    // effect below would keep overwriting the theme every time the
    // user object was replaced (e.g. after changing your picture),
    // undoing any edit made since logging in.
    const loadedFor = useRef<number | null>(null);

    // repaint whenever the theme changes
    useEffect(() => { applyTheme(theme); }, [theme]);

    // On login, take the theme saved on the account (if it has one).
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

    // preview only - not remembered anywhere
    function setTheme(next: Theme) {
        setThemeState(next);
    }

    // the "keep this" path
    function commitTheme(next: Theme) {
        setThemeState(next);
        saveLocalTheme(next);
        if (user) {
            // If this fails (offline, or the background image is too
            // big) the theme still works here and stays in the
            // browser - it just won't follow them to another device,
            // which isn't worth interrupting them over.
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
