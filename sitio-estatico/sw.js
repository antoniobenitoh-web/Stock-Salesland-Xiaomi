// Service worker: hace la app instalable (PWA) y algo más rápida, sin
// arriesgarse a que el navegador se quede pegado a una versión vieja.
//
// IMPORTANTE — sube este número cada vez que hagas un cambio relevante
// en index.html o en este propio sw.js. Al cambiar CACHE_NAME, el
// navegador detecta un service worker "nuevo", borra la caché anterior
// (ver "activate" más abajo) y empieza a servir la versión actual.
// Si NO subes este número, es fácil que el navegador siga sirviendo el
// HTML antiguo desde caché indefinidamente aunque publiques cambios en
// GitHub — es justo lo que pasó la primera vez que se usó JSONP.
const CACHE_VERSION = 'v14';
const CACHE_NAME = `stock-xiaomi-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activa el nuevo SW inmediatamente, sin esperar a que se cierren
  // todas las pestañas abiertas de la app.
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

  // Nunca cachear ni interceptar llamadas al backend de Apps Script (ni
  // el JSONP, ni nada): el stock y el login siempre deben ir en vivo.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    return;
  }

  // HTML y JS del propio sitio: SIEMPRE red primero. Si la red falla
  // (sin conexión), se usa la copia en caché como último recurso. Esto
  // es lo que evita quedarse pegado a una versión vieja del dashboard.
  const isAppShellDoc = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isAppShellDoc) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Resto de recursos estáticos (iconos, manifest, CDNs): caché primero,
  // con la red como respaldo — aquí sí interesa velocidad, y no cambian
  // casi nunca.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
