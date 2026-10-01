import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev (npm run dev), as chamadas de API são encaminhadas para o backend
// local, evitando CORS. Em produção o Caddy serve o SPA e faz o proxy da API
// no mesmo domínio.
const backend = process.env.VITE_DEV_API || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': backend,
      '/products': backend,
      '/customers': backend,
      '/analytics': backend,
      '/marketing': backend,
    },
  },
});
