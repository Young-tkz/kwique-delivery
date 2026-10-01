"use client";

import { useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotifications() {
    useEffect(() => {
        async function setupPushNotifications() {
            try {
                // Browser support
                if (!("serviceWorker" in navigator)) {
                    console.log("Push notifications are not supported.");
                    return;
                }

                if (!("PushManager" in window)) {
                    console.log("Push API is not supported.");
                    return;
                }

                // We need a VAPID public key
                const vapidPublicKey =
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

                if (!vapidPublicKey) {
                    console.error("VAPID public key is missing.");
                    return;
                }

                // Register service worker
                const registration =
                    await navigator.serviceWorker.register("/sw.js");

                console.log("Push service worker registered.");

                // Check existing permission
                let permission = Notification.permission;

                // Ask only when permission hasn't been decided yet
                if (permission === "default") {
                    permission = await Notification.requestPermission();
                }

                if (permission !== "granted") {
                    console.log("Notification permission not granted.");
                    return;
                }

                // Check for an existing subscription
                let subscription =
                    await registration.pushManager.getSubscription();

                // Create subscription if needed
                if (!subscription) {
                    subscription =
                        await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey:
                                urlBase64ToUint8Array(vapidPublicKey),
                        });
                }

                // Save subscription to our backend
                const response = await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(subscription),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to save push subscription."
                    );
                }

                console.log("Push notifications enabled.");
            } catch (error) {
                console.error(
                    "Push notification setup failed:",
                    error
                );
            }
        }

        setupPushNotifications();
    }, []);

    return null;
}