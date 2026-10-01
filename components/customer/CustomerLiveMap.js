'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

const MUTARE_CENTER = [-18.974656, 32.670473]

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

export default function CustomerLiveMap({ order, className = '' }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const layersRef = useRef(null)
    const initializingRef = useRef(false)

    const [riderLocation, setRiderLocation] = useState(null)
    const [mapReady, setMapReady] = useState(false)
    const [locationError, setLocationError] = useState(null)

    /*
     * Load the latest rider location from Supabase.
     */
    useEffect(() => {
        if (!order?.id) return

        let cancelled = false

        async function loadRiderLocation() {
            const supabase = createClient()

            const { data, error } = await supabase
                .from('rider_locations')
                .select('latitude, longitude, updated_at')
                .eq('order_id', order.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (cancelled) return

            if (error) {
                console.error('Unable to load rider location:', error)
                setLocationError(error.message || 'Unable to load rider location')
                return
            }

            if (data) {
                setRiderLocation({
                    lat: data.latitude,
                    lng: data.longitude,
                    updatedAt: data.updated_at,
                })
            }
        }

        loadRiderLocation()

        return () => {
            cancelled = true
        }
    }, [order?.id])

    /*
     * Listen for live rider location updates.
     */
    useEffect(() => {
        if (!order?.id) return

        const supabase = createClient()

        const channel = supabase
            .channel(`customer-rider-location-${order.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rider_locations',
                    filter: `order_id=eq.${order.id}`,
                },
                (payload) => {
                    const location = payload.new

                    if (!location?.latitude || !location?.longitude) {
                        return
                    }

                    setRiderLocation({
                        lat: location.latitude,
                        lng: location.longitude,
                        updatedAt: location.updated_at,
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [order?.id])

    /*
     * Create the Leaflet map.
     */
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || initializingRef.current) {
            return
        }

        let cancelled = false

        async function initializeMap() {
            initializingRef.current = true

            try {
                const L = await import('leaflet')

                if (cancelled || !mapRef.current || mapInstanceRef.current) {
                    initializingRef.current = false
                    return
                }

                const map = L.map(mapRef.current, {
                    center: MUTARE_CENTER,
                    zoom: 13,
                    zoomControl: true,
                })

                L.tileLayer(
                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    {
                        attribution: '&copy; OpenStreetMap contributors',
                    }
                ).addTo(map)

                mapInstanceRef.current = map
                layersRef.current = L.layerGroup().addTo(map)

                setMapReady(true)

                setTimeout(() => {
                    map.invalidateSize()
                }, 100)
            } catch (error) {
                console.error('Unable to initialize map:', error)
            } finally {
                initializingRef.current = false
            }
        }

        initializeMap()

        return () => {
            cancelled = true

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }

            layersRef.current = null
            setMapReady(false)
            initializingRef.current = false
        }
    }, [])

    /*
     * Draw pickup, destination, route context and rider location.
     */
    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current || !layersRef.current || !order) {
            return
        }

        async function drawMap() {
            const L = await import('leaflet')

            const map = mapInstanceRef.current
            const layers = layersRef.current

            layers.clearLayers()

            const pickup =
                order.pickup_lat != null && order.pickup_lng != null
                    ? [Number(order.pickup_lat), Number(order.pickup_lng)]
                    : null

            const destination =
                order.destination_lat != null && order.destination_lng != null
                    ? [
                        Number(order.destination_lat),
                        Number(order.destination_lng),
                    ]
                    : null

            /*
             * Pickup marker
             */
            if (pickup) {
                L.circleMarker(pickup, {
                    radius: 9,
                    color: '#ffffff',
                    weight: 3,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                })
                    .bindPopup(
                        `<strong>Pickup</strong><br>${escapeHtml(
                            order.pickup_address
                        )}`
                    )
                    .addTo(layers)
            }

            /*
             * Destination marker
             */
            if (destination) {
                L.circleMarker(destination, {
                    radius: 9,
                    color: '#ffffff',
                    weight: 3,
                    fillColor: '#dc2626',
                    fillOpacity: 1,
                })
                    .bindPopup(
                        `<strong>Destination</strong><br>${escapeHtml(
                            order.destination_address
                        )}`
                    )
                    .addTo(layers)
            }

            /*
             * Visual route context.
             * This is intentionally a straight line for now.
             */
            if (pickup && destination) {
                L.polyline([pickup, destination], {
                    color: '#64748b',
                    weight: 4,
                    dashArray: '8 10',
                    opacity: 0.8,
                }).addTo(layers)
            }

            /*
             * Rider live location.
             */
            if (
                riderLocation &&
                Number.isFinite(Number(riderLocation.lat)) &&
                Number.isFinite(Number(riderLocation.lng))
            ) {
                const riderPosition = [
                    Number(riderLocation.lat),
                    Number(riderLocation.lng),
                ]

                L.circleMarker(riderPosition, {
                    radius: 11,
                    color: '#ffffff',
                    weight: 3,
                    fillColor: '#111827',
                    fillOpacity: 1,
                })
                    .bindPopup('<strong>Rider</strong><br>Live location')
                    .addTo(layers)

                /*
                 * Keep rider visible without constantly changing zoom.
                 */
                map.panTo(riderPosition, {
                    animate: true,
                    duration: 0.5,
                })
            }

            /*
             * Fit the map around pickup/destination when there is
             * no rider location yet.
             */
            if (!riderLocation && pickup && destination) {
                const bounds = L.latLngBounds([pickup, destination])

                map.fitBounds(bounds, {
                    padding: [40, 40],
                    maxZoom: 14,
                })
            } else if (!riderLocation && pickup) {
                map.setView(pickup, 14)
            } else if (!riderLocation && !pickup && destination) {
                map.setView(destination, 14)
            }
        }

        drawMap()
    }, [
        mapReady,
        order,
        riderLocation,
    ])

    return (
        <div className={`relative w-full overflow-hidden ${className}`}>
            <div
                ref={mapRef}
                className="h-full min-h-[320px] w-full"
            />

            {!riderLocation && (
                <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-md">
                    {order?.status === 'PENDING_RIDER' ||
                    order?.status === 'NEEDS_ADMIN_INTERVENTION'
                        ? 'Waiting for rider'
                        : 'Waiting for rider location'}
                </div>
            )}

            {riderLocation && (
                <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-md">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Rider is live
                </div>
            )}

            {locationError && (
                <div className="absolute bottom-4 left-4 right-4 z-[1000] rounded-xl bg-white/95 px-4 py-3 text-xs text-slate-600 shadow-md">
                    Rider location is not available yet.
                </div>
            )}
        </div>
    )
}