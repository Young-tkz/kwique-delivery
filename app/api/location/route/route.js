import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import {
    geocodeAddress,
    calculateRoute,
} from '../../../../lib/location/geoapify'

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

        const {
            pickup,
            destination,
            pickupAddress,
            destinationAddress,
        } = body

        let pickupLocation = pickup
        let destinationLocation = destination

        /*
         * Preferred path:
         * The customer already selected exact coordinates.
         */
        if (
            pickupLocation?.lat == null ||
            pickupLocation?.lng == null
        ) {
            if (!pickupAddress?.trim()) {
                return NextResponse.json(
                    { error: 'Pickup location is required' },
                    { status: 400 }
                )
            }

            pickupLocation = await geocodeAddress(pickupAddress)
        }

        if (
            destinationLocation?.lat == null ||
            destinationLocation?.lng == null
        ) {
            if (!destinationAddress?.trim()) {
                return NextResponse.json(
                    { error: 'Destination location is required' },
                    { status: 400 }
                )
            }

            destinationLocation =
                await geocodeAddress(destinationAddress)
        }

        const route = await calculateRoute(
            {
                lat: Number(pickupLocation.lat),
                lng: Number(pickupLocation.lng),
            },
            {
                lat: Number(destinationLocation.lat),
                lng: Number(destinationLocation.lng),
            }
        )

        return NextResponse.json({
            success: true,
            pickup: pickupLocation,
            destination: destinationLocation,
            route,
        })
    } catch (error) {
        console.error('Route calculation error:', error)

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to calculate route',
            },
            { status: 500 }
        )
    }
}