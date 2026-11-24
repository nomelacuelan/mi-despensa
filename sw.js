// Permite abrir la app sin conexión y la mantiene actualizada.
// Cuando subas una versión nueva, cambia VERSION (y VERSION_APP en js/app.js).
const VERSION = 'mi-despensa-v2';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/estilos.css', './js/app.js', './js/ia.js', './catalogo.json',
  './iconos/icono.svg', './iconos/icono-192.png', './iconos/icono-512.png', './iconos/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Archivos de la app: primero se pregunta al servidor; sin conexión se usa la copia guardada.
// Las llamadas a la IA (otro dominio) no se tocan.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => { if (res.ok) { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
