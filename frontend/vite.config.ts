// Vite is the tool that runs the React site while I develop it.
// The proxy below means when the site asks for /api/... or
// /images/..., Vite quietly forwards the request to the Express
// backend on port 4000 - so the browser thinks it is all one
// website and I don't hit cross-origin problems in development.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'http://localhost:4000',
            '/images': 'http://localhost:4000',
        },
    },
});
