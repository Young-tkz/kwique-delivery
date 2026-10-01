import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { sendPushToUser } from '../../../../../lib/push/server'

export async function POST(request) {
    try {
        const supabase = await createClient()

        const {
            data: { claims },
            error: claimsError,
        } = await supabase.auth.getClaims()

        if (claimsError || !claims?.sub) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data: profile, error: profileError } =
            await supabase
                .from('profiles')
                .select('role')
                .eq('id', claims.sub)
                .single()

        if (profileError || profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required.' },
                { status: 403 }
            )
        }

        const body = await request.json()

        const orderId = body?.orderId
        const riderId = body?.riderId
        const action = body?.action

        if (!orderId || !riderId || !action) {
            return NextResponse.json(
                {
                    error:
                        'Order ID, rider ID and action are required.',
                },
                { status: 400 }
            )
        }

        if (!['assign', 'reassign'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid assignment action.' },
                { status: 400 }
            )
        }

        const rpcName =
            action === 'assign'
                ? 'admin_assign_delivery'
                : 'admin_reassign_delivery'

        const { data, error } = await supabase.rpc(
            rpcName,
            {
                p_order_id: orderId,
                p_rider_id: riderId,
            }
        )

        if (error) {
            console.error(
                `Admin ${action} RPC error:`,
                error
            )

            return NextResponse.json(
                {
                    error:
                        error.message ||
                        'Unable to update the delivery.',
                },
                { status: 409 }
            )
        }

        /*
         * Get the customer attached to the order.
         */
        const { data: order, error: orderError } =
            await supabase
                .from('orders')
                .select('id, customer_id')
                .eq('id', orderId)
                .single()

        if (orderError || !order) {
            console.error(
                'Failed to load assigned order:',
                orderError
            )

            // Assignment succeeded, so don't turn this into
            // a failed assignment response.
            return NextResponse.json({
                success: true,
                order: data,
                notificationWarning:
                    'Delivery assigned, but notification details could not be loaded.',
            })
        }

        /*
         * Get the rider's user ID.
         * riderId is the public.riders.id, while push
         * subscriptions use the auth/profile user ID.
         */
        const { data: rider, error: riderError } =
            await supabase
                .from('riders')
                .select('user_id')
                .eq('id', riderId)
                .single()

        if (riderError || !rider?.user_id) {
            console.error(
                'Failed to load assigned rider:',
                riderError
            )

            return NextResponse.json({
                success: true,
                order: data,
                notificationWarning:
                    'Delivery assigned, but rider notification could not be sent.',
            })
        }

        /*
         * Notify the assigned rider.
         */
        try {
            await sendPushToUser(
                rider.user_id,
                {
                    title: 'Delivery assigned',
                    body:
                        action === 'reassign'
                            ? 'You have been assigned a delivery.'
                            : 'You have been assigned a new delivery.',
                    url: '/rider',
                }
            )
        } catch (pushError) {
            console.error(
                'Rider assignment push error:',
                pushError
            )
        }

        /*
         * Notify the customer.
         */
        try {
            await sendPushToUser(
                order.customer_id,
                {
                    title:
                        action === 'reassign'
                            ? 'New rider assigned'
                            : 'Rider assigned',
                    body:
                        action === 'reassign'
                            ? 'A new rider has been assigned to your delivery.'
                            : 'A rider has been assigned to your delivery.',
                    url: `/customer/orders/${orderId}`,
                }
            )
        } catch (pushError) {
            console.error(
                'Customer assignment push error:',
                pushError
            )
        }

        return NextResponse.json({
            success: true,
            order: data,
        })
    } catch (error) {
        console.error(
            'Admin assignment error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to update the delivery.',
            },
            { status: 500 }
        )
    }
}