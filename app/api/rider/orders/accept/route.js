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

        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', claims.sub)
            .single()

        if (
            profileError ||
            !profile ||
            profile.role !== 'rider'
        ) {
            return NextResponse.json(
                { error: 'Rider access required' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const orderId = body?.orderId

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required.' },
                { status: 400 }
            )
        }

        // -----------------------------
        // Accept delivery
        // -----------------------------

        const { data, error } = await supabase.rpc(
            'accept_delivery',
            {
                p_order_id: orderId,
            }
        )

        if (error) {
            console.error(
                'Accept delivery RPC error:',
                error
            )

            return NextResponse.json(
                {
                    error:
                        error.message ||
                        'Unable to accept delivery.',
                },
                { status: 409 }
            )
        }

        // -----------------------------
        // Get customer ID
        // -----------------------------

        const { data: order, error: orderError } =
            await supabase
                .from('orders')
                .select('customer_id')
                .eq('id', orderId)
                .single()

        if (orderError) {
            console.error(
                'Customer lookup after acceptance failed:',
                orderError
            )
        } else if (order?.customer_id) {
            // -----------------------------
            // Notify customer
            // -----------------------------

            try {
                await sendPushToUser(
                    order.customer_id,
                    {
                        title: 'Rider assigned',
                        body:
                            'A rider has accepted your delivery.',
                        url: `/customer/orders/${orderId}`,
                    }
                )
            } catch (pushError) {
                console.error(
                    'Customer push notification error:',
                    pushError
                )
            }
        }

        // -----------------------------
        // Response
        // -----------------------------

        return NextResponse.json({
            success: true,
            order: data,
        })
    } catch (error) {
        console.error(
            'Accept delivery error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to accept delivery.',
            },
            { status: 500 }
        )
    }
}