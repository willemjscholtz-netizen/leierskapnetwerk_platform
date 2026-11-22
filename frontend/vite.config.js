import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Alle versoeke na /api gaan na die backend. So bly die
    // sessie-koekie op dieselfde oorsprong en CORS is nie 'n
    // probleem nie - die blaaier sien net een werf.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
