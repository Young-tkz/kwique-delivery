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

        const { data: rider, error: riderError } = await supabase
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

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('rider_id', rider.id)
            .in('status', [
                'ASSIGNED',
                'PICKING_UP',
                'PICKED_UP',
                'ON_THE_WAY',
            ])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (orderError) {
            throw orderError
        }

        return NextResponse.json({
            success: true,
            order: order || null,
        })
    } catch (error) {
        console.error('Active rider order error:', error)

        return NextResponse.json(
            {
                error:
                    error.message || 'Unable to load active delivery.',
            },
            { status: 500 }
        )
    }
}