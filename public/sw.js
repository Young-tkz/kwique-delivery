self.addEventListener("push", (event) => {
    if (!event.data) {
        return;
    }

    let data;

    try {
        data = event.data.json();
    } catch {
        data = {
            title: "KwiQue Delivery",
            body: event.data.text(),
        };
    }

    const title = data.title || "KwiQue Delivery";

    const options = {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192.png",
        badge: data.badge || "/icons/icon-192.png",
        data: {
            url: data.url || "/",
        },
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        }).then((clientList) => {
            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});