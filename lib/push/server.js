import webpush from "web-push";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error("Missing VAPID environment variables.");
}

webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
);

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
}

export async function sendPushToUser(userId, notification) {
    const supabase = getServiceClient();

    const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);

    if (error) {
        console.error(
            "Failed to load push subscriptions:",
            error
        );

        return;
    }

    console.log("PUSH DEBUG - userId:", userId);
    console.log(
        "PUSH DEBUG - subscriptions:",
        subscriptions
    );

    if (!subscriptions?.length) {
        return;
    }

    await sendToSubscriptions(
        subscriptions,
        notification,
        supabase
    );
}

export async function sendPushToAvailableRiders(
    notification
) {
    const supabase = getServiceClient();

    // Get riders who are currently available
    const { data: riders, error: ridersError } =
        await supabase
            .from("riders")
            .select("user_id")
            .eq("availability_status", "available");

    if (ridersError) {
        console.error(
            "Failed to load available riders:",
            ridersError
        );

        return;
    }

    if (!riders?.length) {
        return;
    }

    const riderUserIds = riders
        .map((rider) => rider.user_id)
        .filter(Boolean);

    if (!riderUserIds.length) {
        return;
    }

    // Get push subscriptions belonging to available riders
    const {
        data: subscriptions,
        error: subscriptionsError,
    } = await supabase
        .from("push_subscriptions")
        .select(
            "id, user_id, endpoint, p256dh, auth"
        )
        .in("user_id", riderUserIds);

    if (subscriptionsError) {
        console.error(
            "Failed to load rider push subscriptions:",
            subscriptionsError
        );

        return;
    }

    if (!subscriptions?.length) {
        return;
    }

    await sendToSubscriptions(
        subscriptions,
        notification,
        supabase
    );
}

export async function sendPushToAdmins(notification) {
    const supabase = getServiceClient();

    // Get all admin users
    const { data: admins, error: adminsError } =
        await supabase
            .from("profiles")
            .select("id")
            .eq("role", "admin");

    if (adminsError) {
        console.error(
            "Failed to load admin users:",
            adminsError
        );

        return;
    }

    if (!admins?.length) {
        return;
    }

    const adminUserIds = admins
        .map((admin) => admin.id)
        .filter(Boolean);

    if (!adminUserIds.length) {
        return;
    }

    // Get push subscriptions belonging to admins
    const {
        data: subscriptions,
        error: subscriptionsError,
    } = await supabase
        .from("push_subscriptions")
        .select(
            "id, user_id, endpoint, p256dh, auth"
        )
        .in("user_id", adminUserIds);

    if (subscriptionsError) {
        console.error(
            "Failed to load admin push subscriptions:",
            subscriptionsError
        );

        return;
    }

    if (!subscriptions?.length) {
        return;
    }

    await sendToSubscriptions(
        subscriptions,
        notification,
        supabase
    );
}

async function sendToSubscriptions(
    subscriptions,
    notification,
    supabase
) {
    const payload = JSON.stringify({
        title:
            notification.title ||
            "KwiQue Delivery",

        body:
            notification.body ||
            "",

        url:
            notification.url ||
            "/",

        icon:
            notification.icon ||
            "/icons/icon-192.png",

        badge:
            notification.badge ||
            "/icons/icon-192.png",
    });

    await Promise.all(
        subscriptions.map(
            async (subscription) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint:
                            subscription.endpoint,

                            keys: {
                                p256dh:
                                subscription.p256dh,

                                auth:
                                subscription.auth,
                            },
                        },
                        payload
                    );
                } catch (error) {
                    console.error(
                        "Push notification failed:",
                        error.statusCode,
                        error.message
                    );

                    // Remove expired/invalid subscriptions
                    if (
                        error.statusCode === 404 ||
                        error.statusCode === 410
                    ) {
                        await supabase
                            .from(
                                "push_subscriptions"
                            )
                            .delete()
                            .eq(
                                "id",
                                subscription.id
                            );
                    }
                }
            }
        )
    );
}