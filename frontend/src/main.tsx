// main.tsx - React's entry point: put <App /> inside the
// <div id="root"> in index.html. StrictMode makes React warn
// about common mistakes while developing.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
