import { createClient } from '../../../../lib/supabase/server'

export async function POST(request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return Response.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()

        const subscription = body?.subscription

        if (
            !subscription?.endpoint ||
            !subscription?.keys?.p256dh ||
            !subscription?.keys?.auth
        ) {
            return Response.json(
                { error: 'Invalid push subscription' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
                {
                    onConflict: 'endpoint',
                }
            )

        if (error) {
            console.error('Push subscription error:', error)

            return Response.json(
                {
                    error: error.message,
                },
                { status: 500 }
            )
        }

        return Response.json({
            success: true,
        })
    } catch (error) {
        console.error('Push subscription route error:', error)

        return Response.json(
            {
                error: 'Internal server error',
            },
            { status: 500 }
        )
    }
}