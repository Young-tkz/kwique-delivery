import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { calculateRoute } from '../../../../lib/location/geoapify'
import { sendPushToAvailableRiders } from '../../../../lib/push/server'

function getBillableDistance(distanceKm) {
    if (distanceKm <= 5) {
        return distanceKm
    }

    return Math.ceil(distanceKm)
}

function calculateDeliveryFee(distanceKm) {
    const billableDistance =
        getBillableDistance(distanceKm)

    if (billableDistance <= 3) return 2
    if (billableDistance <= 5) return 3
    if (billableDistance <= 7) return 4
    if (billableDistance <= 9) return 5
    if (billableDistance <= 12) return 6
    if (billableDistance <= 14) return 7
    if (billableDistance <= 17) return 8
    if (billableDistance <= 19) return 9
    if (billableDistance <= 22) return 10

    return billableDistance * 0.5
}

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
            deliveryType,
            packageDetails,
            recipientName,
            recipientPhone,
        } = body

        // -----------------------------
        // Validate required fields
        // -----------------------------

        if (
            !pickup ||
            pickup.lat == null ||
            pickup.lng == null
        ) {
            return NextResponse.json(
                {
                    error:
                        'Valid pickup location is required.',
                },
                { status: 400 }
            )
        }

        if (
            !destination ||
            destination.lat == null ||
            destination.lng == null
        ) {
            return NextResponse.json(
                {
                    error:
                        'Valid destination location is required.',
                },
                { status: 400 }
            )
        }

        if (!deliveryType) {
            return NextResponse.json(
                {
                    error:
                        'Delivery type is required.',
                },
                { status: 400 }
            )
        }

        if (!packageDetails?.trim()) {
            return NextResponse.json(
                {
                    error:
                        'Package details are required.',
                },
                { status: 400 }
            )
        }

        if (!recipientName?.trim()) {
            return NextResponse.json(
                {
                    error:
                        'Recipient name is required.',
                },
                { status: 400 }
            )
        }

        if (!recipientPhone?.trim()) {
            return NextResponse.json(
                {
                    error:
                        'Recipient phone is required.',
                },
                { status: 400 }
            )
        }

        const pickupLocation = {
            lat: Number(pickup.lat),
            lng: Number(pickup.lng),
        }

        const destinationLocation = {
            lat: Number(destination.lat),
            lng: Number(destination.lng),
        }

        if (
            !Number.isFinite(pickupLocation.lat) ||
            !Number.isFinite(pickupLocation.lng) ||
            !Number.isFinite(destinationLocation.lat) ||
            !Number.isFinite(destinationLocation.lng)
        ) {
            return NextResponse.json(
                {
                    error:
                        'Invalid location coordinates.',
                },
                { status: 400 }
            )
        }

        // -----------------------------
        // Calculate route
        // -----------------------------

        const route = await calculateRoute(
            pickupLocation,
            destinationLocation
        )

        const distanceKm = route.distanceKm

        const billableDistanceKm =
            getBillableDistance(distanceKm)

        const deliveryFee =
            calculateDeliveryFee(distanceKm)

        // -----------------------------
        // Create order
        // -----------------------------

        const { data: order, error } =
            await supabase
                .from('orders')
                .insert({
                    customer_id: claims.sub,

                    pickup_address:
                        pickup.formatted ||
                        pickup.name ||
                        'Pinned location',

                    pickup_lat:
                    pickupLocation.lat,

                    pickup_lng:
                    pickupLocation.lng,

                    destination_address:
                        destination.formatted ||
                        destination.name ||
                        'Pinned location',

                    destination_lat:
                    destinationLocation.lat,

                    destination_lng:
                    destinationLocation.lng,

                    delivery_type:
                    deliveryType,

                    package_details:
                        packageDetails.trim(),

                    recipient_name:
                        recipientName.trim(),

                    recipient_phone:
                        recipientPhone.trim(),

                    distance_km:
                    billableDistanceKm,

                    delivery_fee:
                    deliveryFee,

                    status:
                        'PENDING_RIDER',
                })
                .select()
                .single()

        if (error) {
            console.error(
                'Supabase order creation error:',
                error
            )

            return NextResponse.json(
                {
                    error:
                        error.message ||
                        'Unable to create delivery.',
                },
                { status: 500 }
            )
        }

        // -----------------------------
        // Notify available riders
        // -----------------------------

        try {
            await sendPushToAvailableRiders({
                title: 'New delivery available',
                body: 'A new delivery is waiting for acceptance.',
                url: '/rider',
            })
        } catch (pushError) {
            console.error(
                'Rider push notification error:',
                pushError
            )
        }

        // -----------------------------
        // Response
        // -----------------------------

        return NextResponse.json({
            success: true,

            order: {
                id: order.id,
                status: order.status,

                distanceKm,

                billableDistanceKm,

                deliveryFee,
            },
        })
    } catch (error) {
        console.error(
            'Customer order API error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to create delivery.',
            },
            { status: 500 }
        )
    }
}