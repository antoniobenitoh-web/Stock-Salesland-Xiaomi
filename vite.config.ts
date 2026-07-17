import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// Nombre del repositorio de GitHub: se usa como "base" para que los assets
// carguen bien en https://<usuario>.github.io/<repo>/ (GitHub Pages de proyecto).
// Si en el futuro usas un dominio propio o una GitHub Pages de tipo "usuario",
// cambia esto a '/'.
const REPO_NAME = 'Stock-Salesland-Xiaomi';

export default defineConfig(() => {
  return {
    base: `/${REPO_NAME}/`,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Gestión de Stock Xiaomi - Salesland',
          short_name: 'Stock Xiaomi',
          description: 'Dashboard corporativo de stock Salesland | Xiaomi',
          start_url: `/${REPO_NAME}/`,
          scope: `/${REPO_NAME}/`,
          display: 'standalone',
          background_color: '#104A60',
          theme_color: '#104A60',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
