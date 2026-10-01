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

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', claims.sub)
            .single()

        if (profileError || !profile || profile.role !== 'rider') {
            return NextResponse.json(
                { error: 'Rider access required' },
                { status: 403 }
            )
        }

        const body = await request.json()

        const orderId = body?.orderId
        const status = body?.status

        if (!orderId || !status) {
            return NextResponse.json(
                { error: 'Order ID and status are required.' },
                { status: 400 }
            )
        }

        const allowedStatuses = [
            'PICKING_UP',
            'PICKED_UP',
            'ON_THE_WAY',
            'DELIVERED',
        ]

        if (!allowedStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid delivery status.' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase.rpc(
            'update_delivery_status',
            {
                p_order_id: orderId,
                p_status: status,
            }
        )

        if (error) {
            console.error(
                'Update delivery status RPC error:',
                error
            )

            return NextResponse.json(
                {
                    error:
                        error.message ||
                        'Unable to update delivery status.',
                },
                { status: 409 }
            )
        }

        /*
         * The status update succeeded.
         * Now notify the customer.
         */

        let customerId = data?.customer_id

        // If the RPC doesn't return customer_id,
        // fetch it from the order.
        if (!customerId) {
            const { data: order, error: orderError } =
                await supabase
                    .from('orders')
                    .select('customer_id')
                    .eq('id', orderId)
                    .single()

            if (orderError) {
                console.error(
                    'Failed to load customer for push:',
                    orderError
                )
            } else {
                customerId = order?.customer_id
            }
        }

        if (customerId) {
            let notification = null

            if (status === 'PICKED_UP') {
                notification = {
                    title: 'Package picked up',
                    body: 'Your package has been picked up and is on its way.',
                    url: `/customer/orders/${orderId}`,
                }
            }

            if (status === 'ON_THE_WAY') {
                notification = {
                    title: 'Delivery on the way',
                    body: 'Your delivery is now on the way.',
                    url: `/customer/orders/${orderId}`,
                }
            }

            if (status === 'DELIVERED') {
                notification = {
                    title: 'Delivery completed',
                    body: 'Your delivery has been completed.',
                    url: `/customer/orders/${orderId}`,
                }
            }

            if (notification) {
                // Don't make a push failure break the
                // successful delivery-status update.
                try {
                    await sendPushToUser(
                        customerId,
                        notification
                    )
                } catch (pushError) {
                    console.error(
                        'Customer push notification error:',
                        pushError
                    )
                }
            }
        }

        return NextResponse.json({
            success: true,
            order: data,
        })
    } catch (error) {
        console.error(
            'Update delivery status error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to update delivery status.',
            },
            { status: 500 }
        )
    }
}