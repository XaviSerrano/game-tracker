import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const port = Number(process.env.FRONTEND_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('FRONTEND_PORT must be a valid port number.');
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === 'android' ? [{
        name: 'android-html',
        transformIndexHtml(html: string) {
          return html.replace(/\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"]*" crossorigin="anonymous"><\/script>/, '');
        }
      }] : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Express es el backend único y escucha en este puerto en desarrollo.
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});