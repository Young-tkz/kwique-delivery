import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

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

        const body = await request.json()

        const orderId = body?.orderId
        const rating = Number(body?.rating)
        const orderingEasy = body?.orderingEasy
        const trackingUseful = body?.trackingUseful

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required.' },
                { status: 400 }
            )
        }

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5.' },
                { status: 400 }
            )
        }

        if (
            typeof orderingEasy !== 'boolean' ||
            typeof trackingUseful !== 'boolean'
        ) {
            return NextResponse.json(
                {
                    error:
                        'Please answer both experience questions.',
                },
                { status: 400 }
            )
        }

        /*
         * Verify that this order belongs to the
         * authenticated customer and is delivered.
         */
        const { data: order, error: orderError } =
            await supabase
                .from('orders')
                .select('id, customer_id, status')
                .eq('id', orderId)
                .eq('customer_id', claims.sub)
                .single()

        if (orderError || !order) {
            return NextResponse.json(
                { error: 'Delivery not found.' },
                { status: 404 }
            )
        }

        if (order.status !== 'DELIVERED') {
            return NextResponse.json(
                {
                    error:
                        'Feedback can only be submitted after delivery.',
                },
                { status: 409 }
            )
        }

        /*
         * Prevent duplicate feedback.
         */
        const {
            data: existingFeedback,
            error: existingError,
        } = await supabase
            .from('feedback')
            .select('id')
            .eq('order_id', orderId)
            .eq('customer_id', claims.sub)
            .maybeSingle()

        if (existingError) {
            throw existingError
        }

        if (existingFeedback) {
            return NextResponse.json(
                {
                    error:
                        'Feedback has already been submitted for this delivery.',
                },
                { status: 409 }
            )
        }

        const {
            data: feedback,
            error: feedbackError,
        } = await supabase
            .from('feedback')
            .insert({
                order_id: orderId,
                customer_id: claims.sub,
                rating,
                ordering_easy: orderingEasy,
                tracking_useful: trackingUseful,
            })
            .select()
            .single()

        if (feedbackError) {
            throw feedbackError
        }

        return NextResponse.json({
            success: true,
            feedback,
        })
    } catch (error) {
        console.error(
            'Customer feedback error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to submit feedback.',
            },
            { status: 500 }
        )
    }
}