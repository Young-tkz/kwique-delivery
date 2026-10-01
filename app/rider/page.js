'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

const statusLabels = {
    ASSIGNED: 'Assigned',
    PICKING_UP: 'Picking up',
    PICKED_UP: 'Picked up',
    ON_THE_WAY: 'On the way',
    DELIVERED: 'Delivered',
}

const nextAction = {
    ASSIGNED: {
        nextStatus: 'PICKING_UP',
        label: "I'm at Pickup",
    },
    PICKING_UP: {
        nextStatus: 'PICKED_UP',
        label: 'Picked Up',
    },
    PICKED_UP: {
        nextStatus: 'ON_THE_WAY',
        label: 'Start Delivery',
    },
    ON_THE_WAY: {
        nextStatus: 'DELIVERED',
        label: 'Mark Delivered',
    },
}

function HomeIcon({ className = 'h-5 w-5' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3 10 9-7 9 7"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 9.5V21h14V9.5"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 21v-6h6v6"
            />
        </svg>
    )
}

function HistoryIcon({ className = 'h-5 w-5' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={className}
        >
            <circle cx="12" cy="12" r="8.5" />
            <path
                strokeLinecap="round"
                d="M12 7v5l3 2"
            />
        </svg>
    )
}

function NavigationIcon({ className = 'h-6 w-6' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m10.3 13.7 5.2-5.2"
            />
        </svg>
    )
}

function PhoneIcon({ className = 'h-5 w-5' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.6 3.5 9 3l2 5-2.2 1.8a15.5 15.5 0 0 0 5.4 5.4L16 13l5 2 .5 2.4c.2 1-.4 2-1.4 2.4-1.3.5-2.8.5-4.3-.1A18.5 18.5 0 0 1 4.3 8.8c-.6-1.5-.6-3-.1-4.3.4-1 1.4-1.6 2.4-1Z"
            />
        </svg>
    )
}

function MapPinIcon({ className = 'h-5 w-5' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
            />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    )
}

function BottomNavigation() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-[76px] max-w-xl items-center justify-around px-8">
                <Link
                    href="/rider"
                    className="flex flex-col items-center gap-1 text-[#687080]"
                >
                    <HomeIcon className="h-5 w-5" />

                    <span className="text-sm font-semibold">
                        Home
                    </span>
                </Link>

                <Link
                    href="/rider/history"
                    className="flex flex-col items-center gap-1 text-[#687080]"
                >
                    <HistoryIcon className="h-5 w-5" />

                    <span className="text-sm font-semibold">
                        History
                    </span>
                </Link>
            </div>
        </nav>
    )
}

function StatCard({ value, label }) {
    return (
        <div className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-4 shadow-[0_2px_12px_rgba(40,20,10,0.04)]">
            <p className="text-lg font-bold text-[#111111]">
                {value}
            </p>

            <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-[#687080]">
                {label}
            </p>
        </div>
    )
}

export default function RiderDashboard() {
    const supabase = createClient()

    const [orders, setOrders] = useState([])
    const [activeOrder, setActiveOrder] = useState(null)
    const [availability, setAvailability] = useState('offline')
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [message, setMessage] = useState('')
    const [gpsStatus, setGpsStatus] = useState('inactive')
    const [riderName, setRiderName] = useState('Rider')

    const [completedDeliveries, setCompletedDeliveries] = useState(0)
    const [totalDistance, setTotalDistance] = useState(0)

    async function loadRiderProfile() {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                return
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', user.id)
                .single()

            if (error) {
                console.error(
                    'Failed to load rider profile:',
                    error
                )
                return
            }

            setRiderName(data?.name || 'Rider')
        } catch (error) {
            console.error(
                'Rider profile error:',
                error
            )
        }
    }

    /*
     * Real rider statistics.
     *
     * Deliveries:
     * Number of DELIVERED orders belonging to
     * the currently authenticated rider.
     *
     * Distance:
     * Sum of distance_km from those completed
     * deliveries.
     */
    async function loadRiderStats() {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                return
            }

            const {
                data: rider,
                error: riderError,
            } = await supabase
                .from('riders')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (riderError) {
                console.error(
                    'Failed to load rider record:',
                    riderError
                )

                setCompletedDeliveries(0)
                setTotalDistance(0)

                return
            }

            const {
                data: completedOrders,
                error: ordersError,
            } = await supabase
                .from('orders')
                .select('distance_km')
                .eq('rider_id', rider.id)
                .eq('status', 'DELIVERED')

            if (ordersError) {
                console.error(
                    'Failed to load rider statistics:',
                    ordersError
                )

                setCompletedDeliveries(0)
                setTotalDistance(0)

                return
            }

            const deliveries = completedOrders || []

            const distance = deliveries.reduce(
                (total, order) => {
                    return (
                        total +
                        Number(order.distance_km || 0)
                    )
                },
                0
            )

            setCompletedDeliveries(
                deliveries.length
            )

            setTotalDistance(distance)
        } catch (error) {
            console.error(
                'Rider statistics error:',
                error
            )

            setCompletedDeliveries(0)
            setTotalDistance(0)
        }
    }

    async function loadActiveOrder() {
        try {
            const response = await fetch(
                '/api/rider/orders/active'
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to load active delivery.'
                )
            }

            setActiveOrder(
                data.order || null
            )
        } catch (error) {
            console.error(
                'Active delivery error:',
                error
            )

            setActiveOrder(null)
        }
    }

    async function loadOrders() {
        try {
            setLoading(true)

            const response = await fetch(
                '/api/rider/orders/available'
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to load deliveries.'
                )
            }

            setOrders(
                data.orders || []
            )

            setAvailability(
                data.rider?.availabilityStatus ||
                'offline'
            )

            if (data.rider?.name) {
                setRiderName(
                    data.rider.name
                )
            }

            if (
                data.rider?.availabilityStatus ===
                'busy'
            ) {
                await loadActiveOrder()
            } else {
                setActiveOrder(null)
            }

            await loadRiderStats()
        } catch (error) {
            console.error(error)

            setMessage(
                error.message ||
                'Unable to load deliveries.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRiderProfile()
        loadOrders()

        const interval = setInterval(
            loadOrders,
            10000
        )

        return () =>
            clearInterval(interval)
    }, [])

    async function toggleAvailability() {
        if (
            updating ||
            availability === 'busy'
        ) {
            return
        }

        const nextStatus =
            availability === 'available'
                ? 'offline'
                : 'available'

        setUpdating(true)
        setMessage('')

        try {
            const response = await fetch(
                '/api/rider/availability',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        status: nextStatus,
                    }),
                }
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to update availability.'
                )
            }

            setAvailability(
                data.availabilityStatus
            )

            if (
                data.availabilityStatus ===
                'offline'
            ) {
                setOrders([])
                setActiveOrder(null)

                setMessage(
                    'You are now offline.'
                )
            } else {
                setMessage(
                    'You are now online and can receive deliveries.'
                )
            }

            await loadOrders()
        } catch (error) {
            console.error(
                'Availability update error:',
                error
            )

            setMessage(
                error.message ||
                'Unable to update availability.'
            )
        } finally {
            setUpdating(false)
        }
    }

    /*
     * Rider GPS
     *
     * GPS only runs while the rider
     * has an active delivery.
     */
    useEffect(() => {
        if (!activeOrder) {
            setGpsStatus('inactive')
            return
        }

        const activeStatuses = [
            'ASSIGNED',
            'PICKING_UP',
            'PICKED_UP',
            'ON_THE_WAY',
        ]

        if (
            !activeStatuses.includes(
                activeOrder.status
            )
        ) {
            setGpsStatus('inactive')
            return
        }

        if (!navigator.geolocation) {
            setGpsStatus('unsupported')
            return
        }

        setGpsStatus('requesting')

        let watchId = null

        watchId =
            navigator.geolocation.watchPosition(
                async (position) => {
                    const lat =
                        position.coords.latitude

                    const lng =
                        position.coords.longitude

                    setGpsStatus('active')

                    try {
                        const response =
                            await fetch(
                                '/api/rider/location',
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type':
                                            'application/json',
                                    },
                                    body:
                                        JSON.stringify({
                                            orderId:
                                            activeOrder.id,
                                            lat,
                                            lng,
                                        }),
                                }
                            )

                        const data =
                            await response.json()

                        if (!response.ok) {
                            console.error(
                                'GPS update rejected:',
                                data.error
                            )
                        }
                    } catch (error) {
                        console.error(
                            'GPS update error:',
                            error
                        )
                    }
                },
                (error) => {
                    console.error(
                        'Geolocation error:',
                        error
                    )

                    if (error.code === 1) {
                        setGpsStatus(
                            'permission-denied'
                        )
                    } else if (
                        error.code === 2
                    ) {
                        setGpsStatus(
                            'unavailable'
                        )
                    } else if (
                        error.code === 3
                    ) {
                        setGpsStatus('timeout')
                    } else {
                        setGpsStatus('error')
                    }
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 15000,
                }
            )

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(
                    watchId
                )
            }
        }
    }, [
        activeOrder?.id,
        activeOrder?.status,
    ])

    async function acceptDelivery(orderId) {
        if (updating) return

        setUpdating(true)
        setMessage('')

        try {
            const response = await fetch(
                '/api/rider/orders/accept',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        orderId,
                    }),
                }
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to accept delivery.'
                )
            }

            setMessage(
                'Delivery accepted successfully.'
            )

            await loadOrders()
        } catch (error) {
            console.error(error)

            setMessage(
                error.message ||
                'Unable to accept delivery.'
            )

            await loadOrders()
        } finally {
            setUpdating(false)
        }
    }

    async function updateStatus(
        orderId,
        status
    ) {
        if (updating) return

        setUpdating(true)
        setMessage('')

        try {
            const response = await fetch(
                '/api/rider/orders/status',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        orderId,
                        status,
                    }),
                }
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to update delivery status.'
                )
            }

            if (status === 'DELIVERED') {
                setMessage(
                    'Delivery completed successfully.'
                )
            } else {
                setMessage(
                    `Delivery updated: ${
                        statusLabels[status] ||
                        status
                    }`
                )
            }

            await loadOrders()
        } catch (error) {
            console.error(error)

            setMessage(
                error.message ||
                'Unable to update delivery status.'
            )
        } finally {
            setUpdating(false)
        }
    }

    function openNavigation(order) {
        const isGoingToPickup = [
            'ASSIGNED',
            'PICKING_UP',
        ].includes(order.status)

        const lat = isGoingToPickup
            ? order.pickup_lat
            : order.destination_lat

        const lng = isGoingToPickup
            ? order.pickup_lng
            : order.destination_lng

        const address = isGoingToPickup
            ? order.pickup_address
            : order.destination_address

        if (
            lat === null ||
            lat === undefined ||
            lng === null ||
            lng === undefined
        ) {
            setMessage(
                'Navigation coordinates are unavailable.'
            )

            return
        }

        const destination =
            `${lat},${lng}`

        const url =
            `https://www.google.com/maps/dir/?api=1` +
            `&destination=${encodeURIComponent(
                destination
            )}`

        console.log(
            'Navigation target:',
            {
                type: isGoingToPickup
                    ? 'pickup'
                    : 'destination',
                address,
                lat,
                lng,
            }
        )

        window.open(
            url,
            '_blank'
        )
    }

    function callCustomer(order) {
        window.location.href =
            `tel:${order.recipient_phone}`
    }

    return (
        <main className="min-h-screen bg-[#fff8ef] pb-24 text-[#111111]">

            <div className="mx-auto w-full max-w-xl px-4 pb-8 pt-5">

                {/* Greeting */}
                <section className="mt-0">
                    <h2 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-3xl">
                        Good afternoon,{' '}
                        {riderName === 'Rider'
                            ? 'Rider'
                            : riderName.split(' ')[0]}
                    </h2>

                    <p className="mt-1 text-sm text-[#687080]">
                        Ready when you are.
                    </p>
                </section>

                {/* Availability */}
                <section className="mt-4 rounded-[22px] border border-[#ffd6ae] bg-[#fffaf4] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">

                        <div className="flex items-center gap-2">
                            <span
                                className={`h-3 w-3 rounded-full ${
                                    availability ===
                                    'available'
                                        ? 'bg-[#18aa55] shadow-[0_0_0_5px_rgba(24,170,85,0.10)]'
                                        : availability ===
                                        'busy'
                                            ? 'bg-[#f59e0b]'
                                            : 'bg-[#9ca3af] shadow-[0_0_0_5px_rgba(156,163,175,0.12)]'
                                }`}
                            />

                            <div>
                                <p className="text-[16px] font-extrabold uppercase">
                                    {availability ===
                                    'available'
                                        ? 'Online'
                                        : availability ===
                                        'busy'
                                            ? 'Busy'
                                            : 'Offline'}
                                </p>

                                <p className="text-[13px] font-semibold text-[#687080]">
                                    {availability ===
                                    'available'
                                        ? "You're available for deliveries."
                                        : availability ===
                                        'busy'
                                            ? 'You have an active delivery.'
                                            : "You're offline."}
                                </p>
                            </div>
                        </div>

                        {availability !==
                            'busy' && (
                                <button
                                    type="button"
                                    onClick={
                                        toggleAvailability
                                    }
                                    disabled={
                                        updating
                                    }
                                    aria-label="Toggle availability"
                                    className={`relative h-9 w-[58px] shrink-0 rounded-full transition ${
                                        availability ===
                                        'available'
                                            ? 'bg-[#18aa55]'
                                            : 'bg-[#d2d7df]'
                                    } ${
                                        updating
                                            ? 'opacity-60'
                                            : ''
                                    }`}
                                >
                                <span
                                    className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${
                                        availability ===
                                        'available'
                                            ? 'right-1'
                                            : 'left-1'
                                    }`}
                                />
                                </button>
                            )}
                    </div>
                </section>

                {/* Stats */}
                <section className="mt-3 flex gap-3">
                    <StatCard
                        value={
                            completedDeliveries
                        }
                        label="Deliveries"
                    />

                    <StatCard
                        value={`${totalDistance.toFixed(
                            1
                        )} km`}
                        label="Distance"
                    />
                </section>

                {/* Message */}
                {message && (
                    <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium text-[#687080]">
                        {message}
                    </div>
                )}

                {/* Dispatch */}
                <section className="mt-7">
                    <h2 className="text-[17px] font-extrabold">
                        Dispatch
                    </h2>

                    {/* ACTIVE DELIVERY */}
                    {activeOrder && (
                        <article className="mt-3 overflow-hidden rounded-[24px] bg-[#171717] p-5 text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]">

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#ffca0a]">
                                        Active delivery
                                    </p>

                                    <h3 className="mt-2 text-3xl font-black">
                                        #
                                        {activeOrder.order_number ||
                                            activeOrder.id?.slice(
                                                0,
                                                4
                                            ) ||
                                            '----'}
                                    </h3>
                                </div>

                                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold">
                                    {statusLabels[
                                            activeOrder.status
                                            ] ||
                                        activeOrder.status}
                                </span>
                            </div>

                            <div className="mt-5">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-[#a6a6a6]">
                                    Pickup
                                </p>

                                <p className="mt-1 text-[15px] font-bold">
                                    {
                                        activeOrder.pickup_address
                                    }
                                </p>
                            </div>

                            <div className="mt-4">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-[#a6a6a6]">
                                    Destination
                                </p>

                                <p className="mt-1 text-[15px] font-bold">
                                    {
                                        activeOrder.destination_address
                                    }
                                </p>
                            </div>

                            <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">

                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#a6a6a6]">
                                        Distance
                                    </p>

                                    <p className="mt-1 text-xl font-bold">
                                        {Number(
                                            activeOrder.distance_km
                                        ).toFixed(
                                            1
                                        )}{' '}
                                        km
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#a6a6a6]">
                                        Delivery fee
                                    </p>

                                    <p className="mt-1 text-xl font-bold">
                                        $
                                        {Number(
                                            activeOrder.delivery_fee
                                        ).toFixed(
                                            2
                                        )}
                                    </p>
                                </div>

                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        callCustomer(
                                            activeOrder
                                        )
                                    }
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-zinc-100"
                                >
                                    <PhoneIcon className="h-4 w-4" />
                                    Call
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        openNavigation(
                                            activeOrder
                                        )
                                    }
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-zinc-100"
                                >
                                    <NavigationIcon className="h-4 w-4" />
                                    Navigate
                                </button>

                            </div>

                            {nextAction[
                                activeOrder.status
                                ] && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        updateStatus(
                                            activeOrder.id,
                                            nextAction[
                                                activeOrder.status
                                                ]
                                                .nextStatus
                                        )
                                    }
                                    disabled={
                                        updating
                                    }
                                    className="mt-3 w-full rounded-2xl bg-[#ff711c] px-4 py-4 text-sm font-extrabold text-white transition hover:bg-[#f4600c] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {updating
                                        ? 'Updating...'
                                        : nextAction[
                                            activeOrder.status
                                            ].label}
                                </button>
                            )}

                            <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-[#b7b7b7]">
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        gpsStatus ===
                                        'active'
                                            ? 'bg-[#18aa55]'
                                            : 'bg-[#f59e0b]'
                                    }`}
                                />

                                {gpsStatus ===
                                'active'
                                    ? 'Live location active'
                                    : gpsStatus ===
                                    'requesting'
                                        ? 'Getting your location...'
                                        : gpsStatus ===
                                        'permission-denied'
                                            ? 'Location permission denied'
                                            : 'Location inactive'}
                            </div>

                        </article>
                    )}

                    {/* OFFLINE */}
                    {!activeOrder &&
                        availability ===
                        'offline' && (
                            <div className="mt-3 flex min-h-[126px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#ffcfa3] bg-white px-5 text-center">
                                <div className="mb-3 h-3 w-3 rounded-full bg-[#ff711c]" />

                                <p className="text-sm font-semibold text-[#687080]">
                                    Go online to receive
                                    deliveries
                                </p>
                            </div>
                        )}

                    {/* ONLINE / NO DELIVERY */}
                    {!activeOrder &&
                        availability ===
                        'available' && (
                            <>
                                {loading ? (
                                    <div className="mt-3 flex min-h-[126px] items-center justify-center rounded-[22px] border border-dashed border-[#ffcfa3] bg-white px-5 text-center">
                                        <p className="text-sm font-semibold text-[#687080]">
                                            Loading
                                            deliveries...
                                        </p>
                                    </div>
                                ) : orders.length ===
                                0 ? (
                                    <div className="mt-3 flex min-h-[126px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#ffcfa3] bg-white px-5 text-center">
                                        <div className="mb-3 h-3 w-3 rounded-full bg-[#ff711c]" />

                                        <p className="text-sm font-semibold text-[#687080]">
                                            Waiting for
                                            deliveries...
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-3">
                                        {orders.map(
                                            (
                                                order
                                            ) => (
                                                <article
                                                    key={
                                                        order.id
                                                    }
                                                    className="rounded-[24px] bg-[#171717] p-5 text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)]"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#ffca0a]">
                                                                New delivery
                                                                ·
                                                                Just
                                                                now
                                                            </p>

                                                            <h3 className="mt-2 text-3xl font-black">
                                                                #
                                                                {order.order_number ||
                                                                    order.id?.slice(
                                                                        0,
                                                                        4
                                                                    )}
                                                            </h3>
                                                        </div>
                                                    </div>

                                                    <div className="mt-5">
                                                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#a6a6a6]">
                                                            Pickup
                                                        </p>

                                                        <p className="mt-1 text-[15px] font-bold">
                                                            {
                                                                order.pickup_address
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="mt-4">
                                                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#a6a6a6]">
                                                            Destination
                                                        </p>

                                                        <p className="mt-1 text-[15px] font-bold">
                                                            {
                                                                order.destination_address
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
                                                        <p className="text-xl font-bold">
                                                            {Number(
                                                                order.distance_km
                                                            ).toFixed(
                                                                1
                                                            )}{' '}
                                                            km
                                                        </p>

                                                        <p className="text-xl font-bold">
                                                            $
                                                            {Number(
                                                                order.delivery_fee
                                                            ).toFixed(
                                                                2
                                                            )}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            acceptDelivery(
                                                                order.id
                                                            )
                                                        }
                                                        disabled={
                                                            updating
                                                        }
                                                        className="mt-4 w-full rounded-2xl bg-[#ffca0a] px-4 py-4 text-sm font-extrabold text-black transition hover:bg-[#ffd32e] disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {updating
                                                            ? 'Accepting...'
                                                            : 'Accept Delivery'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openNavigation(
                                                                order
                                                            )
                                                        }
                                                        className="mt-2 w-full rounded-2xl bg-white px-4 py-4 text-sm font-bold text-black transition hover:bg-zinc-100"
                                                    >
                                                        View details
                                                    </button>
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                </section>
            </div>

            <BottomNavigation />
        </main>
    )
}