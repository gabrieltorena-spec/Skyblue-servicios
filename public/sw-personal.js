// Service worker del personal.
// El aviso llega vacío: acá se pregunta qué hay y recién ahí se escribe.

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (evento) => {
  evento.waitUntil((async () => {
    let aviso = { titulo: 'Skyblue', cuerpo: 'Hay un pedido nuevo.', url: '/personal/tablero' };
    try {
      const r = await fetch('/personal/aviso-push', { credentials: 'include', cache: 'no-store' });
      if (r.ok) aviso = await r.json();
    } catch (e) { /* sin red: se muestra el texto genérico */ }

    await self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: '/static/icono-192.png',
      badge: '/static/icono-192.png',
      tag: 'skyblue-personal',      // uno solo: no se apilan diez avisos
      renotify: true,
      requireInteraction: true,     // queda en pantalla hasta que lo tocan
      vibrate: [200, 90, 200],
      data: { url: aviso.url || '/personal/tablero' },
    });
  })());
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || '/personal/tablero';
  evento.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) {
      if (c.url.includes('/personal')) { await c.focus(); return c.navigate(destino); }
    }
    return self.clients.openWindow(destino);
  })());
});
