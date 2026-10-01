import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { sendPushToAdmins } from '../../../../lib/push/server'

export async function POST() {
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
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        const { data, error } = await supabase.rpc(
            'flag_unassigned_orders'
        )

        if (error) {
            throw error
        }

        const flaggedOrders = data || []

        /*
         * Only send a push when the function actually
         * moved one or more orders into intervention.
         *
         * This prevents repeated notifications every
         * time the dashboard checks.
         */
        if (flaggedOrders.length > 0) {
            await sendPushToAdmins({
                title: 'Delivery needs attention',
                body:
                    flaggedOrders.length === 1
                        ? 'A delivery has been waiting for a rider for 30 minutes.'
                        : `${flaggedOrders.length} deliveries need admin attention.`,
                url: '/admin/orders',
            })
        }

        return NextResponse.json({
            success: true,
            data: flaggedOrders,
        })
    } catch (error) {
        console.error(
            'Intervention check error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to check interventions.',
            },
            { status: 500 }
        )
    }
}