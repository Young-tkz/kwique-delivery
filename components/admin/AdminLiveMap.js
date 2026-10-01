'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'

const MUTARE_CENTER = [-18.974656, 32.670473]

const ACTIVE_STATUSES = [
    'ASSIGNED',
    'PICKING_UP',
    'PICKED_UP',
    'ON_THE_WAY',
]

const STATUS_LABELS = {
    ASSIGNED: 'Assigned',
    PICKING_UP: 'Picking up',
    PICKED_UP: 'Picked up',
    ON_THE_WAY: 'On the way',
}

const STATUS_COLORS = {
    ASSIGNED: '#2563eb',
    PICKING_UP: '#f59e0b',
    PICKED_UP: '#8b5cf6',
    ON_THE_WAY: '#16a34a',
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

export default function AdminLiveMap({
                                         orders = [],
                                         className = '',
                                     }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const layersRef = useRef(null)
    const initializingRef = useRef(false)

    /*
     * Store the latest location for each order.
     *
     * {
     *   orderId: {
     *      lat,
     *      lng,
     *      updatedAt
     *   }
     * }
     */
    const locationsRef = useRef({})

    /*
     * Create the Leaflet map.
     */
    useEffect(() => {
        if (
            !mapRef.current ||
            mapInstanceRef.current ||
            initializingRef.current
        ) {
            return
        }

        let cancelled = false

        async function initializeMap() {
            initializingRef.current = true

            try {
                const L = await import('leaflet')

                if (
                    cancelled ||
                    !mapRef.current ||
                    mapInstanceRef.current
                ) {
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
                        attribution:
                            '&copy; OpenStreetMap contributors',
                    }
                ).addTo(map)

                mapInstanceRef.current = map

                layersRef.current =
                    L.layerGroup().addTo(map)

                setTimeout(() => {
                    map.invalidateSize()
                }, 100)
            } catch (error) {
                console.error(
                    'Unable to initialize admin map:',
                    error
                )
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
            initializingRef.current = false
        }
    }, [])

    /*
     * Load the latest location for every active delivery.
     */
    useEffect(() => {
        if (!orders.length) {
            return
        }

        let cancelled = false

        async function loadLocations() {
            const supabase = createClient()

            const orderIds = orders
                .filter((order) =>
                    ACTIVE_STATUSES.includes(order.status)
                )
                .map((order) => order.id)

            if (!orderIds.length) {
                locationsRef.current = {}
                return
            }

            const { data, error } = await supabase
                .from('rider_locations')
                .select(
                    'order_id, latitude, longitude, updated_at'
                )
                .in('order_id', orderIds)
                .order('updated_at', {
                    ascending: false,
                })

            if (cancelled) return

            if (error) {
                console.error(
                    'Unable to load admin rider locations:',
                    error
                )
                return
            }

            const latestLocations = {}

            for (const location of data || []) {
                if (
                    latestLocations[location.order_id]
                ) {
                    continue
                }

                latestLocations[location.order_id] = {
                    lat: Number(location.latitude),
                    lng: Number(location.longitude),
                    updatedAt: location.updated_at,
                }
            }

            locationsRef.current = latestLocations

            drawMap()
        }

        loadLocations()

        return () => {
            cancelled = true
        }
    }, [orders])

    /*
     * Realtime rider-location updates.
     */
    useEffect(() => {
        if (!orders.length) return

        const supabase = createClient()

        const channel = supabase
            .channel('admin-live-rider-locations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rider_locations',
                },
                (payload) => {
                    const location = payload.new

                    if (!location?.order_id) {
                        return
                    }

                    if (
                        !Number.isFinite(
                            Number(location.latitude)
                        ) ||
                        !Number.isFinite(
                            Number(location.longitude)
                        )
                    ) {
                        return
                    }

                    locationsRef.current = {
                        ...locationsRef.current,
                        [location.order_id]: {
                            lat: Number(
                                location.latitude
                            ),
                            lng: Number(
                                location.longitude
                            ),
                            updatedAt:
                            location.updated_at,
                        },
                    }

                    drawMap()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orders])

    /*
     * Draw all active deliveries.
     */
    async function drawMap() {
        if (
            !mapInstanceRef.current ||
            !layersRef.current
        ) {
            return
        }

        const L = await import('leaflet')

        const map = mapInstanceRef.current
        const layers = layersRef.current

        layers.clearLayers()

        const activeOrders = orders.filter((order) =>
            ACTIVE_STATUSES.includes(order.status)
        )

        if (!activeOrders.length) {
            map.setView(MUTARE_CENTER, 13)
            return
        }

        const allPoints = []

        for (const order of activeOrders) {
            const pickup =
                order.pickup_lat != null &&
                order.pickup_lng != null
                    ? [
                        Number(order.pickup_lat),
                        Number(order.pickup_lng),
                    ]
                    : null

            const destination =
                order.destination_lat != null &&
                order.destination_lng != null
                    ? [
                        Number(order.destination_lat),
                        Number(order.destination_lng),
                    ]
                    : null

            const rider =
                locationsRef.current[order.id]

            /*
             * Pickup
             */
            if (pickup) {
                allPoints.push(pickup)

                L.circleMarker(pickup, {
                    radius: 7,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                })
                    .bindPopup(`
                        <div style="min-width:180px">
                            <strong>Pickup</strong>
                            <br>
                            ${escapeHtml(
                        order.pickup_address
                    )}
                            <br><br>
                            <strong>Order #${escapeHtml(
                        order.id.slice(0, 8)
                    )}</strong>
                        </div>
                    `)
                    .addTo(layers)
            }

            /*
             * Destination
             */
            if (destination) {
                allPoints.push(destination)

                L.circleMarker(destination, {
                    radius: 7,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#dc2626',
                    fillOpacity: 1,
                })
                    .bindPopup(`
                        <div style="min-width:180px">
                            <strong>Destination</strong>
                            <br>
                            ${escapeHtml(
                        order.destination_address
                    )}
                            <br><br>
                            <strong>Order #${escapeHtml(
                        order.id.slice(0, 8)
                    )}</strong>
                        </div>
                    `)
                    .addTo(layers)
            }

            /*
             * Visual route line.
             */
            if (pickup && destination) {
                L.polyline(
                    [pickup, destination],
                    {
                        color:
                            STATUS_COLORS[
                                order.status
                                ] || '#64748b',
                        weight: 3,
                        dashArray: '7 8',
                        opacity: 0.65,
                    }
                ).addTo(layers)
            }

            /*
             * Rider.
             */
            if (
                rider &&
                Number.isFinite(rider.lat) &&
                Number.isFinite(rider.lng)
            ) {
                const riderPosition = [
                    rider.lat,
                    rider.lng,
                ]

                allPoints.push(riderPosition)

                const riderMarker =
                    L.circleMarker(
                        riderPosition,
                        {
                            radius: 10,
                            color: '#ffffff',
                            weight: 3,
                            fillColor: '#111827',
                            fillOpacity: 1,
                        }
                    )

                riderMarker
                    .bindPopup(`
                        <div style="min-width:190px">
                            <strong>Rider</strong>
                            <br>
                            Order #${escapeHtml(
                        order.id.slice(0, 8)
                    )}
                            <br>
                            Status:
                            ${escapeHtml(
                        STATUS_LABELS[
                            order.status
                            ] ||
                        order.status
                    )}
                            <br><br>
                            <strong>Pickup</strong>
                            <br>
                            ${escapeHtml(
                        order.pickup_address
                    )}
                        </div>
                    `)
                    .addTo(layers)
            }
        }

        /*
         * Fit map around active operations.
         */
        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(
                allPoints
            )

            map.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 14,
            })
        } else {
            map.setView(
                MUTARE_CENTER,
                13
            )
        }
    }

    /*
     * Redraw whenever the active order set changes.
     */
    useEffect(() => {
        drawMap()
    }, [orders])

    return (
        <div
            className={`relative w-full overflow-hidden ${className}`}
        >
            <div
                ref={mapRef}
                className="h-full min-h-[420px] w-full"
            />

            {orders.length === 0 && (
                <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-zinc-700 shadow-md">
                    No active deliveries
                </div>
            )}

            {orders.length > 0 && (
                <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white/95 px-4 py-3 shadow-md">
                    <p className="text-sm font-semibold">
                        Live Operations
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                        {orders.length}{' '}
                        {orders.length === 1
                            ? 'active delivery'
                            : 'active deliveries'}
                    </p>
                </div>
            )}
        </div>
    )
}