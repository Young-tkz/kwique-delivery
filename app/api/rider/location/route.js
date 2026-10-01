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

        const { data: rider, error: riderError } =
            await supabase
                .from('riders')
                .select('id, availability_status')
                .eq('user_id', claims.sub)
                .single()

        if (riderError || !rider) {
            return NextResponse.json(
                { error: 'Rider profile not found.' },
                { status: 404 }
            )
        }

        if (rider.availability_status !== 'busy') {
            return NextResponse.json(
                {
                    error:
                        'Location tracking is only active during a delivery.',
                },
                { status: 409 }
            )
        }

        const body = await request.json()

        const lat = Number(body?.lat)
        const lng = Number(body?.lng)
        const orderId = body?.orderId

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            return NextResponse.json(
                {
                    error:
                        'Valid latitude and longitude are required.',
                },
                { status: 400 }
            )
        }

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required.' },
                { status: 400 }
            )
        }

        if (lat < -90 || lat > 90) {
            return NextResponse.json(
                { error: 'Invalid latitude.' },
                { status: 400 }
            )
        }

        if (lng < -180 || lng > 180) {
            return NextResponse.json(
                { error: 'Invalid longitude.' },
                { status: 400 }
            )
        }

        const { data: order, error: orderError } =
            await supabase
                .from('orders')
                .select('id, rider_id, status')
                .eq('id', orderId)
                .single()

        if (orderError || !order) {
            return NextResponse.json(
                { error: 'Delivery not found.' },
                { status: 404 }
            )
        }

        if (order.rider_id !== rider.id) {
            return NextResponse.json(
                {
                    error:
                        'This delivery is not assigned to you.',
                },
                { status: 403 }
            )
        }

        if (
            ![
                'ASSIGNED',
                'PICKING_UP',
                'PICKED_UP',
                'ON_THE_WAY',
            ].includes(order.status)
        ) {
            return NextResponse.json(
                {
                    error:
                        'Location tracking is not active for this delivery.',
                },
                { status: 409 }
            )
        }

        const {
            data: location,
            error: locationError,
        } = await supabase
            .from('rider_locations')
            .upsert(
                {
                    rider_id: rider.id,
                    order_id: order.id,

                    // Browser sends lat/lng.
                    // Database stores latitude/longitude.
                    latitude: lat,
                    longitude: lng,

                    updated_at:
                        new Date().toISOString(),
                },
                {
                    onConflict:
                        'rider_id,order_id',
                }
            )
            .select()
            .single()

        if (locationError) {
            throw locationError
        }

        return NextResponse.json({
            success: true,
            location,
        })
    } catch (error) {
        console.error(
            'Rider location error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to update rider location.',
            },
            { status: 500 }
        )
    }
}