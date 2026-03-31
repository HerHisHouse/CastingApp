// 🎬 Handler de Notificaciones Push personalizado para la PWA
// Se carga mediante importScripts en el Service Worker de Workbox

self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: data.icon || '/icons/icon-192x192.png',
                badge: data.badge || '/icons/icon-192x192.png',
                data: data.data || { url: '/' },
                tag: data.tag || 'notification-default',
                vibrate: [100, 50, 100],
            };

            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } catch (err) {
            console.error('Error parseando push:', err);
            // Fallback si no es JSON
            event.waitUntil(
                self.registration.showNotification('CastingApp', {
                    body: event.data.text()
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Si ya hay una pestaña abierta, redirigimos esa
            for (let client of windowClients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no, abrimos una nueva
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
