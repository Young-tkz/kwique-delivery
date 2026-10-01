import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { reverseGeocodeLocation } from '../../../../lib/location/geoapify'

export async function POST(request) {
    try {
        const supabase = await createClient()

        const {
            data: { claims },
        } = await supabase.auth.getClaims()

        if (!claims) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()

        const latitude = Number(body.lat)
        const longitude = Number(body.lng)

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return NextResponse.json(
                {
                    error:
                        'Valid latitude and longitude are required',
                },
                { status: 400 }
            )
        }

        const location =
            await reverseGeocodeLocation(
                latitude,
                longitude
            )

        return NextResponse.json({
            success: true,
            location,
        })
    } catch (error) {
        console.error(
            'Reverse geocoding error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to identify location',
            },
            { status: 500 }
        )
    }
}