import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function GET() {
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

        const { data: rider, error: riderError } = await supabase
            .from('riders')
            .select('id, availability_status')
            .eq('user_id', claims.sub)
            .single()

        if (riderError || !rider) {
            return NextResponse.json(
                { error: 'Rider profile not found' },
                { status: 404 }
            )
        }

        /*
         * Offline or busy riders should not receive
         * available delivery opportunities.
         *
         * The accept_delivery RPC performs the same
         * availability check server-side as a final safeguard.
         */
        if (rider.availability_status !== 'available') {
            return NextResponse.json({
                success: true,
                rider: {
                    id: rider.id,
                    availabilityStatus: rider.availability_status,
                },
                orders: [],
            })
        }

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                pickup_address,
                destination_address,
                pickup_lat,
                pickup_lng,
                destination_lat,
                destination_lng,
                delivery_type,
                package_details,
                recipient_name,
                recipient_phone,
                distance_km,
                delivery_fee,
                status,
                created_at
            `)
            .eq('status', 'PENDING_RIDER')
            .is('rider_id', null)
            .order('created_at', { ascending: true })

        if (ordersError) {
            throw ordersError
        }

        return NextResponse.json({
            success: true,
            rider: {
                id: rider.id,
                availabilityStatus: rider.availability_status,
            },
            orders: orders || [],
        })
    } catch (error) {
        console.error('Available rider orders error:', error)

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to load available deliveries.',
            },
            { status: 500 }
        )
    }
}