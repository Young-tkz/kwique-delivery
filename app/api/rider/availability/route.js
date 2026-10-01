import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

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
        const requestedStatus = body?.status

        if (
            requestedStatus !== 'available' &&
            requestedStatus !== 'offline'
        ) {
            return NextResponse.json(
                { error: 'Invalid availability status.' },
                { status: 400 }
            )
        }

        /*
         * Use the service-role client only after verifying
         * the authenticated user is a rider.
         */
        const admin = createAdminClient()

        const {
            data: rider,
            error: riderError,
        } = await admin
            .from('riders')
            .select('id, user_id, availability_status')
            .eq('user_id', claims.sub)
            .single()

        if (riderError || !rider) {
            return NextResponse.json(
                { error: 'Rider profile not found.' },
                { status: 404 }
            )
        }

        /*
         * A rider with an active delivery must remain busy.
         * They cannot manually go offline while delivering.
         */
        if (rider.availability_status === 'busy') {
            return NextResponse.json(
                {
                    error:
                        'You cannot change availability while you have an active delivery.',
                },
                { status: 409 }
            )
        }

        const { data: updatedRider, error: updateError } =
            await admin
                .from('riders')
                .update({
                    availability_status: requestedStatus,
                })
                .eq('id', rider.id)
                .select(
                    'id, availability_status'
                )
                .single()

        if (updateError) {
            console.error(
                'Rider availability update error:',
                updateError
            )

            return NextResponse.json(
                {
                    error:
                        updateError.message ||
                        'Unable to update availability.',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            availabilityStatus:
            updatedRider.availability_status,
        })
    } catch (error) {
        console.error(
            'Rider availability route error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to update availability.',
            },
            { status: 500 }
        )
    }
}