// Service worker del huésped.
// Solo funciona si agregó la app a la pantalla de inicio. En iPhone, sin eso,
// no llega nada: el WhatsApp sigue siendo el camino seguro.

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (evento) => {
  evento.waitUntil((async () => {
    const base = self.registration.scope.replace(/\/$/, '');
    let aviso = { titulo: 'Skyblue Park', cuerpo: 'Tenés una novedad.', url: base };
    try {
      const r = await fetch(base + '/aviso-push', { credentials: 'include', cache: 'no-store' });
      if (r.ok) aviso = await r.json();
    } catch (e) { /* sin red */ }

    await self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: '/static/icono-192.png',
      badge: '/static/icono-192.png',
      tag: 'skyblue-huesped',
      renotify: true,
      data: { url: aviso.url || base },
    });
  })());
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || '/';
  evento.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) {
      if (c.url.includes('/casa/')) { await c.focus(); return c.navigate(destino); }
    }
    return self.clients.openWindow(destino);
  })());
});
