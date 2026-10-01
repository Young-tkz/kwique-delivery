const GEOAPIFY_GEOCODING_URL =
    'https://api.geoapify.com/v1/geocode/search'

const GEOAPIFY_AUTOCOMPLETE_URL =
    'https://api.geoapify.com/v1/geocode/autocomplete'

const GEOAPIFY_ROUTING_URL =
    'https://api.geoapify.com/v1/routing'

const GEOAPIFY_REVERSE_GEOCODING_URL =
    'https://api.geoapify.com/v1/geocode/reverse'

const MUTARE_LON = '32.670473'
const MUTARE_LAT = '-18.974656'

function getApiKey() {
    const apiKey = process.env.GEOAPIFY_API_KEY

    if (!apiKey) {
        throw new Error('GEOAPIFY_API_KEY is not configured')
    }

    return apiKey
}

/**
 * Convert a full address into coordinates.
 */
export async function geocodeAddress(address) {
    if (!address?.trim()) {
        throw new Error('Address is required')
    }

    const params = new URLSearchParams({
        text: address.trim(),

        // Restrict the search to Zimbabwe.
        filter: 'countrycode:zw',

        // Geoapify expects longitude,latitude.
        bias: `proximity:${MUTARE_LON},${MUTARE_LAT}`,

        limit: '1',
        format: 'json',
        apiKey: getApiKey(),
    })

    const response = await fetch(
        `${GEOAPIFY_GEOCODING_URL}?${params.toString()}`,
        {
            cache: 'no-store',
        }
    )

    if (!response.ok) {
        throw new Error(
            `Geoapify geocoding failed with status ${response.status}`
        )
    }

    const data = await response.json()

    const result = data.results?.[0]

    if (!result) {
        throw new Error('No location was found for this address')
    }

    return {
        lat: Number(result.lat),
        lng: Number(result.lon),
        formatted: result.formatted,
        placeId: result.place_id ?? null,
        resultType: result.result_type ?? null,
        confidence: result.rank?.confidence ?? null,
    }
}

/**
 * Return location suggestions while the user is typing.
 *
 * Example:
 * "Chicken Inn"
 * "Holiday Inn"
 * "Aerodrome Road"
 */
export async function autocompleteAddress(text) {
    if (!text?.trim()) {
        return []
    }

    const params = new URLSearchParams({
        text: text.trim(),
        filter: 'countrycode:zw',
        limit: '5',
        apiKey: getApiKey(),
    })

    const url =
        `${GEOAPIFY_AUTOCOMPLETE_URL}?${params.toString()}`

    console.log('GEOAPIFY AUTOCOMPLETE URL:', url)

    const response = await fetch(url, {
        cache: 'no-store',
    })

    const data = await response.json()

    console.log('GEOAPIFY RAW AUTOCOMPLETE RESPONSE:', data)

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Geoapify autocomplete failed with status ${response.status}`
        )
    }

    return (data.features ?? []).map((feature) => {
        const properties = feature.properties ?? {}

        return {
            name:
                properties.name ??
                properties.address_line1 ??
                properties.formatted ??
                'Unknown location',

            formatted:
                properties.formatted ??
                properties.address_line1 ??
                'Unknown address',

            lat: Number(properties.lat),
            lng: Number(properties.lon),

            placeId: properties.place_id ?? null,
            resultType: properties.result_type ?? null,
            category: properties.category ?? null,
            city: properties.city ?? null,
            street: properties.street ?? null,
            houseNumber: properties.housenumber ?? null,
            country: properties.country ?? null,
        }
    })
}
export async function calculateRoute(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error(
            'Pickup and destination coordinates are required'
        )
    }

    if (
        typeof pickup.lat !== 'number' ||
        typeof pickup.lng !== 'number' ||
        typeof destination.lat !== 'number' ||
        typeof destination.lng !== 'number'
    ) {
        throw new Error(
            'Pickup and destination coordinates must be valid numbers'
        )
    }

    const params = new URLSearchParams({
        waypoints:
            `${pickup.lat},${pickup.lng}|` +
            `${destination.lat},${destination.lng}`,

        mode: 'motorcycle',

        type: 'short',

        format: 'geojson',

        apiKey: getApiKey(),
    })

    const response = await fetch(
        `${GEOAPIFY_ROUTING_URL}?${params.toString()}`,
        {
            cache: 'no-store',
        }
    )

    if (!response.ok) {
        throw new Error(
            `Geoapify routing failed with status ${response.status}`
        )
    }

    const data = await response.json()

    const route = data.features?.[0]

    if (!route) {
        throw new Error('No route was returned')
    }

    const distanceMeters = route.properties?.distance
    const timeSeconds = route.properties?.time

    if (typeof distanceMeters !== 'number') {
        throw new Error('No route distance was returned')
    }

    return {
        distanceMeters,
        distanceKm: distanceMeters / 1000,

        timeSeconds:
            typeof timeSeconds === 'number'
                ? timeSeconds
                : null,
    }
}

const GEOAPIFY_PLACES_URL =
    'https://api.geoapify.com/v2/places'

export async function searchPlaces(text) {
    if (!text?.trim()) {
        return []
    }

    const params = new URLSearchParams({
        name: text.trim(),

        bias: `proximity:${MUTARE_LON},${MUTARE_LAT}`,

        limit: '10',

        lang: 'en',

        apiKey: getApiKey(),
    })

    const response = await fetch(
        `${GEOAPIFY_PLACES_URL}?${params.toString()}`,
        {
            cache: 'no-store',
        }
    )

    if (!response.ok) {
        throw new Error(
            `Geoapify Places search failed with status ${response.status}`
        )
    }

    const data = await response.json()

    return (data.features ?? []).map((feature) => {
        const properties = feature.properties ?? {}

        return {
            name:
                properties.name ??
                properties.address_line1 ??
                properties.formatted ??
                'Unknown place',

            formatted:
                properties.formatted ??
                properties.address_line1 ??
                'Unknown address',

            lat: Number(properties.lat),
            lng: Number(properties.lon),

            placeId: properties.place_id ?? null,

            categories: properties.categories ?? [],

            city: properties.city ?? null,

            street: properties.street ?? null,

            distance: properties.distance ?? null,
        }
    })
}

export async function reverseGeocodeLocation(
    latitude,
    longitude
) {
    if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number'
    ) {
        throw new Error(
            'Valid latitude and longitude are required'
        )
    }

    const baseParams = {
        lat: String(latitude),
        lon: String(longitude),
        format: 'json',
        limit: '5',
        countrycodes: 'zw',
        apiKey: getApiKey(),
    }

    /*
     * First look specifically for a nearby amenity.
     * This is what can give us names such as:
     *
     * Me Mac Restaurant
     * Holiday Inn
     * Chicken Inn
     */
    const amenityParams = new URLSearchParams({
        ...baseParams,
        type: 'amenity',
    })

    const amenityResponse = await fetch(
        `${GEOAPIFY_REVERSE_GEOCODING_URL}?${amenityParams.toString()}`,
        {
            cache: 'no-store',
        }
    )

    if (!amenityResponse.ok) {
        throw new Error(
            `Geoapify reverse geocoding failed with status ${amenityResponse.status}`
        )
    }

    const amenityData = await amenityResponse.json()

    const amenity =
        amenityData.results?.find(
            (result) =>
                result.result_type === 'amenity' &&
                result.name
        ) ?? amenityData.results?.[0]

    if (amenity) {
        return {
            name:
                amenity.name ||
                amenity.address_line1 ||
                'Pinned location',

            formatted:
                amenity.formatted ||
                amenity.address_line1 ||
                amenity.address_line2 ||
                'Pinned location',

            lat: latitude,
            lng: longitude,

            placeId: amenity.place_id ?? null,

            resultType:
                amenity.result_type ?? 'amenity',

            street: amenity.street ?? null,

            houseNumber:
                amenity.housenumber ?? null,

            city: amenity.city ?? null,

            country:
                amenity.country ?? 'Zimbabwe',

            source: 'reverse-geocoding',
        }
    }

    /*
     * No named amenity found.
     * Now ask for the nearest normal address.
     */
    const addressParams = new URLSearchParams({
        ...baseParams,
    })

    const addressResponse = await fetch(
        `${GEOAPIFY_REVERSE_GEOCODING_URL}?${addressParams.toString()}`,
        {
            cache: 'no-store',
        }
    )

    if (!addressResponse.ok) {
        throw new Error(
            `Geoapify reverse geocoding failed with status ${addressResponse.status}`
        )
    }

    const addressData = await addressResponse.json()

    const address = addressData.results?.[0]

    if (!address) {
        return {
            name: 'Pinned location',

            formatted:
                `Pinned location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,

            lat: latitude,
            lng: longitude,

            placeId: null,

            resultType: 'pin',

            source: 'map-pin',
        }
    }

    return {
        name:
            address.address_line1 ||
            address.street ||
            address.name ||
            'Pinned location',

        formatted:
            address.formatted ||
            address.address_line1 ||
            address.address_line2 ||
            'Pinned location',

        lat: latitude,
        lng: longitude,

        placeId: address.place_id ?? null,

        resultType:
            address.result_type ?? 'address',

        street: address.street ?? null,

        houseNumber:
            address.housenumber ?? null,

        city: address.city ?? null,

        country:
            address.country ?? 'Zimbabwe',

        source: 'reverse-geocoding',
    }
}