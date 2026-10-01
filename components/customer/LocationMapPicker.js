'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_LOCATION = {
    lat: -18.974656,
    lng: 32.670473,
}

export default function LocationMapPicker({
                                              initialLocation,
                                              onConfirm,
                                              onCancel,
                                          }) {
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const markerRef = useRef(null)

    // Prevent React Strict Mode from initializing
    // Leaflet twice while the dynamic import is loading.
    const initializingRef = useRef(false)

    const startingLocation =
        initialLocation?.lat != null &&
        initialLocation?.lng != null
            ? {
                lat: Number(initialLocation.lat),
                lng: Number(initialLocation.lng),
            }
            : DEFAULT_LOCATION

    useEffect(() => {
        let cancelled = false

        async function initializeMap() {
            if (
                !mapContainerRef.current ||
                mapRef.current ||
                initializingRef.current
            ) {
                return
            }

            initializingRef.current = true

            try {
                // Leaflet must only be loaded in the browser.
                const L = await import('leaflet')

                const leaflet = L.default || L

                // The component may have unmounted while
                // Leaflet was loading.
                if (
                    cancelled ||
                    !mapContainerRef.current ||
                    mapRef.current
                ) {
                    return
                }

                const map = leaflet
                    .map(mapContainerRef.current)
                    .setView(
                        [
                            startingLocation.lat,
                            startingLocation.lng,
                        ],
                        16
                    )

                leaflet
                    .tileLayer(
                        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            attribution:
                                '&copy; OpenStreetMap contributors',
                        }
                    )
                    .addTo(map)

                const marker = leaflet
                    .marker(
                        [
                            startingLocation.lat,
                            startingLocation.lng,
                        ],
                        {
                            draggable: true,
                        }
                    )
                    .addTo(map)

                marker.bindPopup(
                    'Move the pin to the exact location.'
                )

                marker.openPopup()

                mapRef.current = map
                markerRef.current = marker
            } catch (error) {
                console.error(
                    'Leaflet initialization error:',
                    error
                )
            } finally {
                initializingRef.current = false
            }
        }

        initializeMap()

        return () => {
            cancelled = true

            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
                markerRef.current = null
            }

            initializingRef.current = false
        }
    }, [])

    async function confirmLocation() {
        if (!markerRef.current) {
            return
        }

        const position =
            markerRef.current.getLatLng()

        try {
            const response = await fetch(
                '/api/location/reverse',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        lat: position.lat,
                        lng: position.lng,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to identify this location'
                )
            }

            onConfirm({
                ...data.location,

                // Always preserve the exact pin coordinates.
                lat: position.lat,
                lng: position.lng,

                needsPin: false,
            })
        } catch (error) {
            console.error(
                'Reverse geocoding error:',
                error
            )

            // The coordinates are still valid even if
            // reverse geocoding fails.
            onConfirm({
                name: 'Pinned location',

                formatted:
                    `Pinned location (${position.lat.toFixed(
                        6
                    )}, ${position.lng.toFixed(6)})`,

                lat: position.lat,
                lng: position.lng,

                placeId: null,

                resultType: 'pin',

                needsPin: false,
            })
        }
    }

    return (
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-4">
                <h3 className="font-semibold text-zinc-900">
                    Choose your exact location
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                    Drag the pin to the exact pickup or
                    destination point.
                </p>
            </div>

            <div
                ref={mapContainerRef}
                className="h-80 w-full"
            />

            <div className="flex gap-3 border-t border-zinc-200 p-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={confirmLocation}
                    className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                    Confirm location
                </button>
            </div>
        </div>
    )
}