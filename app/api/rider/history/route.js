import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

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

        /*
         * The riders table is the source of truth
         * for rider authorization.
         */
        const { data: rider, error: riderError } =
            await supabase
                .from('riders')
                .select('id')
                .eq('user_id', claims.sub)
                .single()

        if (riderError || !rider) {
            return NextResponse.json(
                { error: 'Rider profile not found.' },
                { status: 404 }
            )
        }

        /*
         * Get completed deliveries.
         */
        const {
            data: deliveries,
            error: deliveriesError,
        } = await supabase
            .from('orders')
            .select(`
                id,
                pickup_address,
                destination_address,
                delivery_type,
                recipient_name,
                distance_km,
                status,
                created_at,
                delivered_at
            `)
            .eq('rider_id', rider.id)
            .eq('status', 'DELIVERED')
            .order('delivered_at', {
                ascending: false,
            })

        if (deliveriesError) {
            throw deliveriesError
        }

        const history = deliveries || []

        /*
         * Calculate stats using delivered_at.
         */
        const now = new Date()

        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)

        const startOfWeek = new Date(now)
        const day = startOfWeek.getDay()

        /*
         * Monday = start of week.
         */
        const daysFromMonday =
            day === 0 ? 6 : day - 1

        startOfWeek.setDate(
            startOfWeek.getDate() -
            daysFromMonday
        )

        startOfWeek.setHours(0, 0, 0, 0)

        const todayCount = history.filter(
            (delivery) =>
                delivery.delivered_at &&
                new Date(delivery.delivered_at) >=
                startOfToday
        ).length

        const weekCount = history.filter(
            (delivery) =>
                delivery.delivered_at &&
                new Date(delivery.delivered_at) >=
                startOfWeek
        ).length

        return NextResponse.json({
            success: true,
            stats: {
                today: todayCount,
                week: weekCount,
                total: history.length,
            },
            deliveries: history,
        })
    } catch (error) {
        console.error(
            'Rider history error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to load rider history.',
            },
            { status: 500 }
        )
    }
}