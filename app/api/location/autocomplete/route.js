import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { autocompleteAddress } from '../../../../lib/location/geoapify'

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

        const body = await request.json()
        const text = body?.text?.trim()

        if (!text || text.length < 2) {
            return NextResponse.json({
                success: true,
                results: [],
            })
        }

        /*
         * 1. Search KwiQue's local places first.
         */
        const searchTerm = `%${text}%`

        const { data: localPlaces, error: localError } = await supabase
            .from('location_places')
            .select(`
        id,
        name,
        formatted_address,
        lat,
        lng,
        place_id,
        result_type,
        category,
        city,
        street,
        house_number,
        country,
        country_code,
        source,
        search_count
      `)
            .or(
                `name.ilike.${searchTerm},formatted_address.ilike.${searchTerm}`
            )
            .order('search_count', {
                ascending: false,
            })
            .limit(5)

        if (localError) {
            console.error(
                'Local location search error:',
                localError
            )
        }

        /*
         * 2. Ask Geoapify as well.
         *
         * We keep the external results because they may contain
         * places KwiQue has never seen before.
         */
        const geoapifyResults = await autocompleteAddress(text)

        /*
         * 3. Convert local places into the same format used
         *    by Geoapify results.
         */
        const localResults = (localPlaces || []).map((place) => ({
            name: place.name,
            formatted: place.formatted_address,
            lat: place.lat,
            lng: place.lng,
            placeId: place.place_id || place.id,
            resultType: place.result_type,
            category: place.category,
            city: place.city,
            street: place.street,
            houseNumber: place.house_number,
            country: place.country,
            countryCode: place.country_code,
            confidence: 1,
            source: 'kwiQue',
            needsPin: false,
        }))

        /*
         * 4. Merge results and remove obvious duplicates.
         */
        const combined = [
            ...localResults,
            ...(geoapifyResults || []).map((place) => ({
                ...place,
                source: 'geoapify',
            })),
        ]

        const seen = new Set()

        const results = combined.filter((place) => {
            const key =
                place.placeId ||
                `${place.lat}:${place.lng}`

            if (seen.has(key)) {
                return false
            }

            seen.add(key)

            return true
        }).slice(0, 8)

        return NextResponse.json({
            success: true,
            results,
        })
    } catch (error) {
        console.error(
            'Location autocomplete error:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Unable to search locations.',
            },
            { status: 500 }
        )
    }
}