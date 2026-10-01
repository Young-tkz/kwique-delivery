import Link from 'next/link'
import { createClient } from '../../../lib/supabase/server'

function formatDate(date) {
    if (!date) return ''

    return new Date(date).toLocaleDateString('en-ZW', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

function formatTime(date) {
    if (!date) return ''

    return new Date(date).toLocaleTimeString('en-ZW', {
        hour: 'numeric',
        minute: '2-digit',
    })
}

function formatStatus(status) {
    if (!status) return 'Unknown'

    return status
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getStatusStyle(status) {
    switch (status) {
        case 'DELIVERED':
            return 'bg-green-50 text-green-700'

        case 'CANCELLED':
        case 'CANCELED':
            return 'bg-red-50 text-red-700'

        case 'PENDING_RIDER':
            return 'bg-amber-50 text-amber-700'

        case 'ACCEPTED':
        case 'PICKED_UP':
        case 'IN_TRANSIT':
            return 'bg-blue-50 text-blue-700'

        default:
            return 'bg-zinc-100 text-zinc-700'
    }
}

function isActiveOrder(status) {
    return status !== 'DELIVERED' &&
        status !== 'CANCELLED' &&
        status !== 'CANCELED'
}

export default async function CustomerOrdersPage({ searchParams }) {
    const supabase = await createClient()

    const params = await searchParams
    const filter = params?.filter || 'all'

    const {
        data: { claims },
    } = await supabase.auth.getClaims()

    let orders = []

    if (claims?.sub) {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                pickup_address,
                destination_address,
                delivery_type,
                recipient_name,
                distance_km,
                delivery_fee,
                status,
                created_at,
                accepted_at,
                picked_up_at,
                delivered_at
            `)
            .eq('customer_id', claims.sub)
            .order('created_at', {
                ascending: false,
            })

        if (error) {
            console.error('Customer orders error:', error)
        } else {
            orders = data || []
        }
    }

    // -----------------------------
    // Filter orders
    // -----------------------------

    if (filter === 'active') {
        orders = orders.filter((order) =>
            isActiveOrder(order.status)
        )
    }

    if (filter === 'delivered') {
        orders = orders.filter(
            (order) => order.status === 'DELIVERED'
        )
    }

    const tabClass = (tab) =>
        filter === tab
            ? 'shrink-0 rounded-full bg-[#351d1a] px-5 py-2.5 text-sm font-semibold text-white'
            : 'shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#8a6259] shadow-sm ring-1 ring-black/5 transition hover:bg-[#fff8f6]'

    return (
        <div className="mx-auto w-full max-w-3xl pb-8">

            {/* Header */}

            <section className="mb-7">
                <p className="text-sm font-medium text-[#8a6259]">
                    Your activity
                </p>

                <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#351d1a]">
                    Orders
                </h1>

                <p className="mt-2 text-sm text-[#8a6259]">
                    View your delivery history and current orders.
                </p>
            </section>

            {/* Filters */}

            <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                <Link
                    href="/customer/orders"
                    className={tabClass('all')}
                >
                    All
                </Link>

                <Link
                    href="/customer/orders?filter=active"
                    className={tabClass('active')}
                >
                    Active
                </Link>

                <Link
                    href="/customer/orders?filter=delivered"
                    className={tabClass('delivered')}
                >
                    Delivered
                </Link>
            </div>

            {/* Orders */}

            {orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <article
                            key={order.id}
                            className="rounded-[28px] bg-white p-5 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-6"
                        >
                            <div className="flex items-start justify-between gap-4">

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8a6259]">
                                        {order.delivery_type}
                                    </p>

                                    <p className="mt-1 text-xs text-[#a58a82]">
                                        #{order.id.slice(0, 8)}
                                    </p>
                                </div>

                                <span
                                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(order.status)}`}
                                >
                                    {formatStatus(order.status)}
                                </span>
                            </div>

                            {/* Route */}

                            <div className="mt-5 space-y-4">

                                <div className="flex gap-3">
                                    <div className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-[#ed1c24]">
                                        <div className="h-1 w-1 rounded-full bg-[#ed1c24]" />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[#8a6259]">
                                            Pickup
                                        </p>

                                        <p className="mt-0.5 text-sm font-semibold text-[#351d1a]">
                                            {order.pickup_address}
                                        </p>
                                    </div>
                                </div>

                                <div className="ml-[5px] h-3 border-l border-dashed border-[#d8c4bd]" />

                                <div className="flex gap-3">
                                    <div className="mt-1 flex h-3 w-3 shrink-0 rounded-full bg-[#351d1a]" />

                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[#8a6259]">
                                            Destination
                                        </p>

                                        <p className="mt-0.5 text-sm font-semibold text-[#351d1a]">
                                            {order.destination_address}
                                        </p>
                                    </div>
                                </div>

                            </div>

                            {/* Order information */}

                            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-black/5 pt-4">

                                <div>
                                    <p className="text-xs text-[#8a6259]">
                                        Date
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[#351d1a]">
                                        {formatDate(order.created_at)}
                                    </p>

                                    <p className="text-xs text-[#a58a82]">
                                        {formatTime(order.created_at)}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs text-[#8a6259]">
                                        Delivery fee
                                    </p>

                                    <p className="mt-1 text-lg font-bold text-[#351d1a]">
                                        {order.delivery_fee != null
                                            ? `$${Number(order.delivery_fee).toFixed(2)}`
                                            : '—'}
                                    </p>

                                    {order.distance_km != null && (
                                        <p className="text-xs text-[#a58a82]">
                                            {Number(order.distance_km).toFixed(1)} km
                                        </p>
                                    )}
                                </div>

                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-12">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0ed] text-2xl">
                        {filter === 'delivered' ? '✓' : '📦'}
                    </div>

                    <h2 className="mt-5 text-xl font-bold text-[#351d1a]">
                        {filter === 'active'
                            ? 'No active orders'
                            : filter === 'delivered'
                                ? 'No delivered orders'
                                : 'No orders yet'}
                    </h2>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8a6259]">
                        {filter === 'active'
                            ? 'You do not have any deliveries currently in progress.'
                            : filter === 'delivered'
                                ? 'Your completed deliveries will appear here.'
                                : 'Once you create a delivery, your orders will appear here.'}
                    </p>

                </section>
            )}
        </div>
    )
}