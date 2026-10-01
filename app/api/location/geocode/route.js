import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { geocodeAddress } from '../../../../lib/location/geoapify'

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
        const { address } = body

        if (!address?.trim()) {
            return NextResponse.json(
                { error: 'Address is required' },
                { status: 400 }
            )
        }

        const location = await geocodeAddress(address)

        return NextResponse.json({
            success: true,
            location,
        })
    } catch (error) {
        console.error('Geocoding error:', error)

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Geocoding failed',
            },
            { status: 500 }
        )
    }
}