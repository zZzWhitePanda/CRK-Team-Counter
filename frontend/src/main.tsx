// main.tsx - React's entry point: put <App /> inside the
// <div id="root"> in index.html. StrictMode makes React warn
// about common mistakes while developing.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './auth';
import { applyAccent, getSavedAccent } from './accent';
import './theme.css';

// apply the user's saved accent colour before the app paints
applyAccent(getSavedAccent());

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);
