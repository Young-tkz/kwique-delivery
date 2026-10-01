import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'

function formatDate(dateString) {
    if (!dateString) return '—'

    return new Date(dateString).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function getShortId(id) {
    return id ? `#${id.slice(0, 8)}` : '—'
}

function getAddress(address) {
    if (!address) return '—'

    if (typeof address === 'string') {
        return address
    }

    return (
        address.formatted ||
        address.address ||
        address.name ||
        '—'
    )
}

export default async function RiderHistoryPage() {
    const supabase = await createClient()

    const {
        data: { claims },
    } = await supabase.auth.getClaims()

    if (!claims?.sub) {
        return (
            <div className="rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)]">
                <h1 className="text-xl font-bold text-[#351d1a]">
                    Rider history
                </h1>

                <p className="mt-2 text-sm text-[#8a6259]">
                    You must be logged in to view your delivery history.
                </p>
            </div>
        )
    }

    const {
        data: rider,
        error: riderError,
    } = await supabase
        .from('riders')
        .select('id')
        .eq('user_id', claims.sub)
        .single()

    if (riderError || !rider) {
        console.error(
            'Failed to load rider:',
            riderError
        )

        return (
            <div className="rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)]">
                <h1 className="text-xl font-bold text-[#351d1a]">
                    Delivery history
                </h1>

                <p className="mt-2 text-sm text-red-600">
                    Unable to load your rider account.
                </p>

                <Link
                    href="/rider"
                    className="mt-5 inline-block text-sm font-semibold text-[#ed1c24] hover:underline"
                >
                    Back to dashboard
                </Link>
            </div>
        )
    }

    const {
        data: history,
        error,
    } = await supabase
        .from('orders')
        .select(`
            id,
            pickup_address,
            destination_address,
            delivery_type,
            package_details,
            recipient_name,
            recipient_phone,
            distance_km,
            status,
            created_at,
            accepted_at,
            picked_up_at,
            delivered_at
        `)
        .eq('rider_id', rider.id)
        .eq('status', 'DELIVERED')
        .order('delivered_at', {
            ascending: false,
        })

    if (error) {
        console.error(
            'Failed to load rider history:',
            error
        )
    }

    const deliveries = history || []

    return (
        <div className="w-full">

            {/* Header */}
            <section className="mb-7">
                <Link
                    href="/rider"
                    className="text-sm font-medium text-[#8a6259] transition hover:text-[#351d1a]"
                >
                    ← Back to dashboard
                </Link>

                <div className="mt-5">
                    <p className="text-sm font-medium text-[#8a6259]">
                        Rider
                    </p>

                    <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#351d1a]">
                        Delivery history
                    </h1>

                    <p className="mt-2 text-sm text-[#8a6259]">
                        Your completed KwiQue deliveries.
                    </p>
                </div>
            </section>

            {/* Error */}
            {error && (
                <section className="mb-6 rounded-[24px] border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-semibold text-red-700">
                        Unable to load delivery history.
                    </p>

                    <p className="mt-1 text-xs text-red-600">
                        Please try refreshing the page.
                    </p>
                </section>
            )}

            {/* Empty state */}
            {!error && deliveries.length === 0 && (
                <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(60,30,20,0.06)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e8] text-xl font-bold text-[#ed1c24]">
                        ✓
                    </div>

                    <h2 className="mt-5 text-lg font-bold text-[#351d1a]">
                        No completed deliveries yet
                    </h2>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8a6259]">
                        Once you complete a delivery, it will appear here.
                    </p>

                    <Link
                        href="/rider"
                        className="mt-6 inline-flex rounded-full bg-[#ff6b0a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ed5f00]"
                    >
                        Back to dashboard
                    </Link>
                </section>
            )}

            {/* History */}
            {!error && deliveries.length > 0 && (
                <section className="space-y-5">

                    {deliveries.map((order) => {
                        const deliveredAt =
                            order.delivered_at ||
                            order.updated_at

                        const pickup =
                            getAddress(order.pickup_address)

                        const destination =
                            getAddress(
                                order.destination_address
                            )

                        return (
                            <article
                                key={order.id}
                                className="overflow-hidden rounded-[28px] border border-[#f2c7a7] bg-white shadow-[0_4px_24px_rgba(60,30,20,0.06)]"
                            >

                                {/* Order header */}
                                <div className="flex flex-col gap-4 border-b border-[#f3e4dc] p-6 sm:flex-row sm:items-start sm:justify-between">

                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-[#8a6259]">
                                                {getShortId(order.id)}
                                            </span>

                                            <span className="rounded-full bg-[#e7f8ec] px-3 py-1 text-xs font-bold text-[#16a34a]">
                                                Delivered
                                            </span>
                                        </div>

                                        <p className="mt-3 text-sm text-[#8a6259]">
                                            {formatDate(deliveredAt)}
                                        </p>
                                    </div>

                                    {order.distance_km != null && (
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs font-medium text-[#8a6259]">
                                                Distance
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-[#351d1a]">
                                                {Number(
                                                    order.distance_km
                                                ).toFixed(1)} km
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Route */}
                                <div className="p-6">

                                    <div className="relative">

                                        {/* Connecting line */}
                                        <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-px bg-[#e8d5cb]" />

                                        {/* Pickup */}
                                        <div className="relative flex gap-4">
                                            <div className="mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-[#351d1a] ring-1 ring-[#351d1a]" />

                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-wide text-[#8a6259]">
                                                    Pickup
                                                </p>

                                                <p className="mt-1 text-sm font-semibold leading-5 text-[#351d1a]">
                                                    {pickup}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Destination */}
                                        <div className="relative mt-8 flex gap-4">
                                            <div className="mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-[#16a34a] ring-1 ring-[#16a34a]" />

                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-wide text-[#8a6259]">
                                                    Delivered to
                                                </p>

                                                <p className="mt-1 text-sm font-semibold leading-5 text-[#351d1a]">
                                                    {destination}
                                                </p>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Recipient */}
                                    {(order.recipient_name ||
                                        order.recipient_phone) && (
                                        <div className="mt-7 rounded-[20px] border border-[#f0e1da] bg-[#fffaf7] p-5 rounded-md">
                                            <p className="text-xs font-medium uppercase tracking-wide text-[#8a6259]">
                                                Recipient
                                            </p>

                                            {order.recipient_name && (
                                                <p className="mt-1 text-sm font-bold text-[#351d1a]">
                                                    {order.recipient_name}
                                                </p>
                                            )}

                                            {order.recipient_phone && (
                                                <p className="mt-1 text-sm text-[#8a6259]">
                                                    {order.recipient_phone}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Delivery details */}
                                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                                        <div className="rounded-[20px] border border-[#f0e1da] bg-[#fffaf7] p-5">
                                            <p className="text-xs font-medium text-[#8a6259]">
                                                Delivery type
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-[#351d1a]">
                                                {order.delivery_type || 'Standard'}
                                            </p>
                                        </div>

                                        <div className="rounded-[20px] border border-[#f0e1da] bg-[#fffaf7] p-5">
                                            <p className="text-xs font-medium text-[#8a6259]">
                                                Completed
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-[#351d1a]">
                                                {formatDate(deliveredAt)}
                                            </p>
                                        </div>

                                        <div className="rounded-[20px] border border-[#f0e1da] bg-[#fffaf7] p-5">
                                            <p className="text-xs font-medium text-[#8a6259]">
                                                Status
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-[#16a34a]">
                                                Delivered
                                            </p>
                                        </div>

                                    </div>

                                </div>
                            </article>
                        )
                    })}

                </section>
            )}

        </div>
    )
}