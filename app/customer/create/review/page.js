'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewDeliveryPage() {
    const router = useRouter()

    const [draft, setDraft] = useState(null)
    const [route, setRoute] = useState(null)
    const [loadingRoute, setLoadingRoute] = useState(true)
    const [placingOrder, setPlacingOrder] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const savedDraft =
            sessionStorage.getItem('kwiQueDeliveryDraft')

        if (!savedDraft) {
            router.push('/customer/create')
            return
        }

        try {
            setDraft(JSON.parse(savedDraft))
        } catch (error) {
            console.error(
                'Unable to load delivery draft:',
                error
            )

            setError(
                'Unable to load your delivery details.'
            )

            setLoadingRoute(false)
        }
    }, [router])

    useEffect(() => {
        if (
            !draft?.pickup?.lat ||
            !draft?.pickup?.lng ||
            !draft?.destination?.lat ||
            !draft?.destination?.lng
        ) {
            return
        }

        async function calculateDeliveryRoute() {
            setLoadingRoute(true)
            setError('')

            try {
                const response = await fetch(
                    '/api/location/route',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            pickup: draft.pickup,
                            destination: draft.destination,
                        }),
                    }
                )

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        'Unable to calculate delivery route.'
                    )
                }

                setRoute(data.route)
            } catch (error) {
                console.error(
                    'Route calculation error:',
                    error
                )

                setError(
                    error.message ||
                    'Unable to calculate delivery route.'
                )

                setRoute(null)
            } finally {
                setLoadingRoute(false)
            }
        }

        calculateDeliveryRoute()
    }, [draft])

    function getBillableDistance(distanceKm) {
        if (distanceKm <= 5) {
            return distanceKm
        }

        return Math.ceil(distanceKm)
    }

    function getDeliveryFee(distanceKm) {
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

    async function placeDelivery() {
        if (!draft || !route || placingOrder) {
            return
        }

        setPlacingOrder(true)
        setError('')

        try {
            const response = await fetch(
                '/api/customer/orders',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pickup: draft.pickup,
                        destination: draft.destination,
                        deliveryType: draft.deliveryType,
                        packageDetails:
                        draft.packageDetails,
                        recipientName:
                        draft.recipientName,
                        recipientPhone:
                        draft.recipientPhone,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to place delivery.'
                )
            }

            sessionStorage.removeItem(
                'kwiQueDeliveryDraft'
            )

            router.push(
                `/customer/orders/${data.order.id}`
            )
        } catch (error) {
            console.error(
                'Place delivery error:',
                error
            )

            setError(
                error.message ||
                'Unable to place delivery.'
            )

            setPlacingOrder(false)
        }
    }

    if (!draft) {
        return (
            <div className="mx-auto max-w-2xl">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-red-500" />
                        <p className="text-sm text-zinc-500">
                            Loading delivery...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const distanceKm =
        typeof route?.distanceKm === 'number'
            ? route.distanceKm
            : null

    const billableDistance =
        distanceKm !== null
            ? getBillableDistance(distanceKm)
            : null

    const deliveryFee =
        distanceKm !== null
            ? getDeliveryFee(distanceKm)
            : null

    return (
        <div className="mx-auto max-w-2xl pb-8">

            {/* Header */}
            <div className="mb-7">
                <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                        Final step
                    </div>

                    <span className="text-xs font-medium text-zinc-400">
                        Step 2 of 2
                    </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                    Review your delivery
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Everything look good? Check the details below
                    before placing your delivery.
                </p>
            </div>

            <div className="space-y-4">

                {/* Route */}
                <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">

                    <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-zinc-950">
                                    Delivery route
                                </h2>

                                <p className="mt-0.5 text-xs text-zinc-500">
                                    Pickup and destination
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-sm">
                                ↗
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-5 sm:px-6">

                        {/* Pickup */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                </div>

                                <div className="my-1 h-10 w-px border-l border-dashed border-zinc-300" />
                            </div>

                            <div className="min-w-0 flex-1 pt-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Pickup
                                </p>

                                <p className="mt-1 text-sm font-medium leading-6 text-zinc-900">
                                    {draft.pickup?.formatted ||
                                        draft.pickup?.name ||
                                        'Pickup location not selected'}
                                </p>
                            </div>
                        </div>

                        {/* Destination */}
                        <div className="flex gap-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                                <div className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
                            </div>

                            <div className="min-w-0 flex-1 pt-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Destination
                                </p>

                                <p className="mt-1 text-sm font-medium leading-6 text-zinc-900">
                                    {draft.destination?.formatted ||
                                        draft.destination?.name ||
                                        'Destination not selected'}
                                </p>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Delivery details */}
                <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-5">
                        <h2 className="font-semibold text-zinc-950">
                            Delivery details
                        </h2>

                        <p className="mt-0.5 text-xs text-zinc-500">
                            What you're sending
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                        <div className="rounded-2xl bg-zinc-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Type
                            </p>

                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm shadow-sm">
                                    {draft.deliveryType === 'Food'
                                        ? '🍔'
                                        : draft.deliveryType === 'Groceries'
                                            ? '🛒'
                                            : draft.deliveryType === 'Documents'
                                                ? '📄'
                                                : draft.deliveryType === 'Parcels'
                                                    ? '📦'
                                                    : '📦'}
                                </div>

                                <p className="text-sm font-semibold text-zinc-900">
                                    {draft.deliveryType}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-zinc-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Package
                            </p>

                            <p className="mt-2 text-sm font-medium leading-6 text-zinc-800">
                                {draft.packageDetails}
                            </p>
                        </div>

                    </div>
                </section>

                {/* Recipient */}
                <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-5">
                        <h2 className="font-semibold text-zinc-950">
                            Recipient
                        </h2>

                        <p className="mt-0.5 text-xs text-zinc-500">
                            Who will receive the delivery
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-bold text-zinc-700">
                            {draft.recipientName
                                ?.charAt(0)
                                ?.toUpperCase() || '?'}
                        </div>

                        <div className="min-w-0">
                            <p className="font-semibold text-zinc-900">
                                {draft.recipientName}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                                {draft.recipientPhone}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Delivery fee */}
                <section className="overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-lg">

                    <div className="p-5 sm:p-6">

                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Delivery fee
                                </p>

                                <div className="mt-2">
                                    {loadingRoute ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
                                            <span className="text-sm text-zinc-400">
                                                Calculating...
                                            </span>
                                        </div>
                                    ) : deliveryFee !== null ? (
                                        <span className="text-4xl font-bold tracking-tight">
                                            ${deliveryFee.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-semibold text-red-400">
                                            Unable to calculate
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg">
                                $
                            </div>
                        </div>

                        {!loadingRoute && route && (
                            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">

                                <div>
                                    <p className="text-xs text-zinc-500">
                                        Route distance
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                                        {distanceKm.toFixed(2)} km
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-zinc-500">
                                        Billable distance
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                                        {billableDistance} km
                                    </p>
                                </div>

                            </div>
                        )}

                        {!loadingRoute && !route && !error && (
                            <p className="mt-3 text-sm text-zinc-400">
                                Route distance unavailable.
                            </p>
                        )}

                    </div>
                </section>

                {/* Error */}
                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700">
                        {error}
                    </div>
                )}

                {/* CTA */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={placeDelivery}
                        disabled={
                            loadingRoute ||
                            deliveryFee === null ||
                            !!error ||
                            placingOrder
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-300"
                    >
                        {placingOrder ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Placing delivery...
                            </>
                        ) : (
                            <>
                                Place delivery
                                <span className="text-base">
                                    →
                                </span>
                            </>
                        )}
                    </button>

                    <p className="mt-3 text-center text-xs text-zinc-400">
                        You'll be able to track your delivery after
                        placing the order.
                    </p>
                </div>

            </div>
        </div>
    )
}