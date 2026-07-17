// Service worker mínimo: cachea el "app shell" (HTML, manifest, iconos y
// las librerías de CDN) para que la app cargue más rápido y sea
// instalable. Los datos de stock en sí NUNCA se cachean aquí — siempre
// se piden en vivo al backend, para no mostrar inventario desactualizado.
const CACHE_NAME = 'stock-xiaomi-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas al backend de Apps Script: el stock siempre
  // debe pedirse en vivo.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
