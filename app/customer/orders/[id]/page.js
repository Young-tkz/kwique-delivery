'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import CustomerLiveMap from '../../../../components/customer/CustomerLiveMap'
import CustomerFeedback from '../../../../components/customer/CustomerFeedback'

const statusLabels = {
    PENDING_RIDER: 'Finding a rider',
    ASSIGNED: 'Rider assigned',
    PICKING_UP: 'Rider picking up',
    PICKED_UP: 'Package picked up',
    ON_THE_WAY: 'On the way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    NEEDS_ADMIN_INTERVENTION: 'Finding a rider',
}

function getTimeline(status) {
    return [
        {
            label: 'Order placed',
            active: true,
        },
        {
            label: 'Rider accepted',
            active: [
                'ASSIGNED',
                'PICKING_UP',
                'PICKED_UP',
                'ON_THE_WAY',
                'DELIVERED',
            ].includes(status),
        },
        {
            label: 'Picking up',
            active: [
                'PICKING_UP',
                'PICKED_UP',
                'ON_THE_WAY',
                'DELIVERED',
            ].includes(status),
        },
        {
            label: 'Picked up',
            active: [
                'PICKED_UP',
                'ON_THE_WAY',
                'DELIVERED',
            ].includes(status),
        },
        {
            label: 'On the way',
            active: [
                'ON_THE_WAY',
                'DELIVERED',
            ].includes(status),
        },
        {
            label: 'Delivered',
            active: status === 'DELIVERED',
        },
    ]
}

export default function CustomerOrderPage() {
    const params = useParams()
    const router = useRouter()

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [realtimeConnected, setRealtimeConnected] = useState(false)

    useEffect(() => {
        if (!params.id) return

        const supabase = createClient()
        let channel = null
        let cancelled = false

        async function loadOrder() {
            try {
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser()

                if (userError || !user) {
                    router.push('/login')
                    return
                }

                const { data, error: orderError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', params.id)
                    .eq('customer_id', user.id)
                    .single()

                if (orderError) {
                    throw orderError
                }

                if (cancelled) return

                setOrder(data)

                /*
                 * Create the channel once.
                 *
                 * IMPORTANT:
                 * The postgres_changes callback is registered BEFORE
                 * subscribe() is called.
                 */
                channel = supabase
                    .channel(`customer-order-${params.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'orders',
                            filter: `id=eq.${params.id}`,
                        },
                        (payload) => {
                            console.log(
                                'Order realtime update:',
                                payload.new
                            )

                            setOrder((current) => {
                                if (!current) {
                                    return payload.new
                                }

                                return {
                                    ...current,
                                    ...payload.new,
                                }
                            })
                        }
                    )

                /*
                 * Subscribe ONLY after the callback has been added.
                 */
                channel.subscribe((status) => {
                    console.log(
                        'Order realtime status:',
                        status
                    )

                    if (status === 'SUBSCRIBED') {
                        setRealtimeConnected(true)
                    } else if (
                        status === 'CHANNEL_ERROR' ||
                        status === 'TIMED_OUT' ||
                        status === 'CLOSED'
                    ) {
                        setRealtimeConnected(false)
                    }
                })
            } catch (err) {
                console.error('Load order error:', err)

                if (!cancelled) {
                    setError('Unable to load this delivery.')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadOrder()

        return () => {
            cancelled = true

            setRealtimeConnected(false)

            if (channel) {
                supabase.removeChannel(channel)
                channel = null
            }
        }
    }, [params.id, router])

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">
                    Loading delivery...
                </p>
            </main>
        )
    }

    if (error || !order) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
                <div className="text-center">

                    <h1 className="text-xl font-semibold text-gray-900">
                        Delivery not found
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        {error || 'We could not find this delivery.'}
                    </p>

                    <button
                        onClick={() => router.push('/customer')}
                        className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
                    >
                        Back to dashboard
                    </button>

                </div>
            </main>
        )
    }

    const statusLabel =
        statusLabels[order.status] || order.status

    const timeline = getTimeline(order.status)

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">

                    <button
                        onClick={() => router.push('/customer')}
                        className="text-lg font-bold tracking-tight text-gray-900"
                    >
                        KwiQue
                    </button>

                    <div className="flex items-center gap-3">

            <span
                className={`h-2 w-2 rounded-full ${
                    realtimeConnected
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                }`}
            />

                        <span className="text-sm text-gray-500">
              {realtimeConnected
                  ? 'Live tracking'
                  : 'Connecting...'}
            </span>

                    </div>

                </div>
            </header>

            <div className="mx-auto max-w-5xl px-5 py-6">

                {/* Status */}
                <section className="rounded-2xl bg-white p-6 shadow-sm">

                    <p className="text-sm font-medium text-gray-500">
                        Current status
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-gray-900">
                        {statusLabel}
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        Order #{order.id.slice(0, 8)}
                    </p>

                </section>

                {/* Live map */}
                <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
                    <CustomerLiveMap
                        order={order}
                        className="h-[420px]"
                    />
                </section>

                {/* Delivery progress */}
                <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">

                    <h2 className="text-lg font-semibold text-gray-900">
                        Delivery progress
                    </h2>

                    <div className="mt-6 space-y-5">

                        {timeline.map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-4"
                            >

                                <div
                                    className={`h-3 w-3 rounded-full ${
                                        item.active
                                            ? 'bg-green-500'
                                            : 'bg-gray-300'
                                    }`}
                                />

                                <span
                                    className={`text-sm ${
                                        item.active
                                            ? 'font-medium text-gray-900'
                                            : 'text-gray-400'
                                    }`}
                                >
                  {item.label}
                </span>

                            </div>
                        ))}

                    </div>

                </section>

                {/* Locations */}
                <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">

                    <h2 className="text-lg font-semibold text-gray-900">
                        Delivery details
                    </h2>

                    <div className="mt-5 space-y-5">

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Pickup
                            </p>

                            <p className="mt-1 text-sm text-gray-900">
                                {order.pickup_address}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Destination
                            </p>

                            <p className="mt-1 text-sm text-gray-900">
                                {order.destination_address}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-5">

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    Delivery type
                                </p>

                                <p className="mt-1 text-sm capitalize text-gray-900">
                                    {order.delivery_type}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    Delivery fee
                                </p>

                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                    ${Number(order.delivery_fee).toFixed(2)}
                                </p>
                            </div>

                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Distance
                            </p>

                            <p className="mt-1 text-sm text-gray-900">
                                {Number(order.distance_km).toFixed(2)} km
                            </p>
                        </div>

                    </div>

                </section>

                {/* Recipient */}
                <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">

                    <h2 className="text-lg font-semibold text-gray-900">
                        Recipient
                    </h2>

                    <div className="mt-4">

                        <p className="font-medium text-gray-900">
                            {order.recipient_name}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                            {order.recipient_phone}
                        </p>

                    </div>

                </section>

                {/* Package */}
                <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">

                    <h2 className="text-lg font-semibold text-gray-900">
                        Package
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                        {order.package_details}
                    </p>

                </section>

                {order.status === 'DELIVERED' && (
                    <div className="mt-5">
                        <CustomerFeedback orderId={order.id} />
                    </div>
                )}

            </div>
        </main>
    )
}