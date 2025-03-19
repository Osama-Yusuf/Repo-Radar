import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'frontend.repo-radar.svc.cluster.local', // Explicitly allow this host
      'repo-radar-frontend.apps.stgocp.mwanitest.local',
      'localhost', // Allow localhost
      '*'
    ],
    cors: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      clientPort: 5173,
    },
  },
  define: {
    _WS_TOKEN_: JSON.stringify('development'),
  },
});
