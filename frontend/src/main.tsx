// app entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './auth';
import { ThemeProvider } from './themeContext';
import { applyTheme, loadLocalTheme } from './theme';
import './theme.css';

// apply theme before render so colours don't flash
applyTheme(loadLocalTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* theme needs the logged in user */}
        <AuthProvider>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </AuthProvider>
    </React.StrictMode>
);
