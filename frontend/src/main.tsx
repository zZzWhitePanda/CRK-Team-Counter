// main.tsx - React's entry point: put <App /> inside the
// <div id="root"> in index.html. StrictMode makes React warn
// about common mistakes while developing.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './auth';
import { ThemeProvider } from './themeContext';
import { applyTheme, loadLocalTheme } from './theme';
import './theme.css';

// Paint the saved theme BEFORE React renders anything. If this
// waited for the app to start, the page would flash the default
// colours first, which looks broken.
applyTheme(loadLocalTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* ThemeProvider sits inside AuthProvider because it needs to
            know who's logged in to load their saved theme */}
        <AuthProvider>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </AuthProvider>
    </React.StrictMode>
);
