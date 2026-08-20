// dev server settings. the proxy forwards /api and /images to the backend
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
