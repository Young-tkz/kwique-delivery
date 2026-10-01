import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";

export async function POST() {
    try {
        const supabase = await createClient();

        const {
            data: { claims },
            error: claimsError,
        } = await supabase.auth.getClaims();

        if (claimsError || !claims?.sub) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        await sendPushToUser(claims.sub, {
            title: "KwiQue Test Notification",
            body: "Web Push is working! 🚀",
            url: "/",
        });

        return NextResponse.json({
            success: true,
            message: "Test notification sent.",
        });
    } catch (error) {
        console.error("Push test error:", error);

        return NextResponse.json(
            {
                error: error.message || "Failed to send test notification.",
            },
            { status: 500 }
        );
    }
}