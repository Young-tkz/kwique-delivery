'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

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

function StarRating({ rating }) {
    return (
        <div
            className="flex items-center gap-0.5"
            aria-label={`${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={
                        star <= rating
                            ? 'text-amber-400'
                            : 'text-zinc-200'
                    }
                >
                    ★
                </span>
            ))}
        </div>
    )
}

function SummaryCard({ label, value, suffix }) {
    return (
        <div className="rounded-2xl border border-[#eadfd4] bg-white p-5 shadow-[0_4px_20px_rgba(60,30,20,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                {label}
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">
                {value}

                {suffix && (
                    <span className="ml-1 text-base font-medium text-zinc-400">
                        {suffix}
                    </span>
                )}
            </p>
        </div>
    )
}

function QuestionResult({ label, yes, no }) {
    return (
        <div className="rounded-2xl border border-[#eee7e1] bg-[#faf8f6] p-5">
            <p className="text-sm font-semibold text-zinc-900">
                {label}
            </p>

            <div className="mt-5 flex items-center gap-8">
                <div>
                    <p className="text-2xl font-bold text-green-600">
                        {yes}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                        Yes
                    </p>
                </div>

                <div>
                    <p className="text-2xl font-bold text-red-600">
                        {no}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                        No
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function AdminFeedbackPage() {
    const [feedback, setFeedback] = useState([])
    const [profiles, setProfiles] = useState({})
    const [orders, setOrders] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    async function loadFeedback() {
        const supabase = createClient()

        try {
            setError('')

            const {
                data: feedbackData,
                error: feedbackError,
            } = await supabase
                .from('feedback')
                .select(`
                    id,
                    order_id,
                    customer_id,
                    rating,
                    ordering_easy,
                    tracking_useful,
                    created_at
                `)
                .order('created_at', {
                    ascending: false,
                })

            if (feedbackError) {
                throw feedbackError
            }

            const loadedFeedback = feedbackData || []

            setFeedback(loadedFeedback)

            /*
             * Load customer profiles.
             */
            const customerIds = [
                ...new Set(
                    loadedFeedback
                        .map(
                            (item) =>
                                item.customer_id
                        )
                        .filter(Boolean)
                ),
            ]

            if (customerIds.length > 0) {
                const {
                    data: profileData,
                    error: profileError,
                } = await supabase
                    .from('profiles')
                    .select(`
                        id,
                        name,
                        phone,
                        email
                    `)
                    .in('id', customerIds)

                if (profileError) {
                    throw profileError
                }

                const profileMap = {}

                for (const profile of profileData || []) {
                    profileMap[profile.id] =
                        profile
                }

                setProfiles(profileMap)
            } else {
                setProfiles({})
            }

            /*
             * Load related orders.
             */
            const orderIds = [
                ...new Set(
                    loadedFeedback
                        .map(
                            (item) =>
                                item.order_id
                        )
                        .filter(Boolean)
                ),
            ]

            if (orderIds.length > 0) {
                const {
                    data: orderData,
                    error: orderError,
                } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        pickup_address,
                        destination_address,
                        delivery_type,
                        delivery_fee,
                        status
                    `)
                    .in('id', orderIds)

                if (orderError) {
                    throw orderError
                }

                const orderMap = {}

                for (const order of orderData || []) {
                    orderMap[order.id] = order
                }

                setOrders(orderMap)
            } else {
                setOrders({})
            }
        } catch (err) {
            console.error(
                'Admin feedback error:',
                err
            )

            setError(
                err?.message ||
                'Unable to load feedback.'
            )
        } finally {
            setLoading(false)
        }
    }

    /*
     * Initial load + realtime updates.
     */
    useEffect(() => {
        loadFeedback()

        const supabase = createClient()

        const channel = supabase
            .channel('admin-feedback')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'feedback',
                },
                () => {
                    loadFeedback()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const statistics = useMemo(() => {
        if (!feedback.length) {
            return {
                average: '0.0',
                total: 0,
                easyYes: 0,
                easyNo: 0,
                trackingYes: 0,
                trackingNo: 0,
                stars: {
                    5: 0,
                    4: 0,
                    3: 0,
                    2: 0,
                    1: 0,
                },
            }
        }

        const totalRating = feedback.reduce(
            (total, item) =>
                total +
                Number(item.rating || 0),
            0
        )

        const stars = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
        }

        let easyYes = 0
        let easyNo = 0
        let trackingYes = 0
        let trackingNo = 0

        for (const item of feedback) {
            const rating = Number(item.rating)

            if (stars[rating] !== undefined) {
                stars[rating] += 1
            }

            if (item.ordering_easy === true) {
                easyYes += 1
            }

            if (item.ordering_easy === false) {
                easyNo += 1
            }

            if (item.tracking_useful === true) {
                trackingYes += 1
            }

            if (item.tracking_useful === false) {
                trackingNo += 1
            }
        }

        return {
            average: (
                totalRating /
                feedback.length
            ).toFixed(1),

            total: feedback.length,

            easyYes,
            easyNo,

            trackingYes,
            trackingNo,

            stars,
        }
    }, [feedback])

    return (
        <div className="mx-auto w-full max-w-[1500px]">
            {/* Header */}
            <section className="mb-7">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a6259]">
                    Customer experience
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                    Feedback
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    Review customer experience after completed deliveries.
                </p>
            </section>

            {/* Error */}
            {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                    label="Average rating"
                    value={
                        loading
                            ? '—'
                            : statistics.average
                    }
                    suffix={
                        loading
                            ? ''
                            : '/ 5'
                    }
                />

                <SummaryCard
                    label="Responses"
                    value={
                        loading
                            ? '—'
                            : statistics.total
                    }
                />

                <SummaryCard
                    label="Ordering easy"
                    value={
                        loading
                            ? '—'
                            : statistics.total
                                ? `${Math.round(
                                    (statistics.easyYes /
                                        statistics.total) *
                                    100
                                )}%`
                                : '0%'
                    }
                />

                <SummaryCard
                    label="Tracking useful"
                    value={
                        loading
                            ? '—'
                            : statistics.total
                                ? `${Math.round(
                                    (statistics.trackingYes /
                                        statistics.total) *
                                    100
                                )}%`
                                : '0%'
                    }
                />
            </div>

            {/* Analytics */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
                {/* Rating breakdown */}
                <section className="rounded-2xl border border-[#eadfd4] bg-white p-5 shadow-[0_4px_20px_rgba(60,30,20,0.04)] sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                            Ratings
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-zinc-950">
                            Rating breakdown
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                            Distribution of customer ratings.
                        </p>
                    </div>

                    <div className="mt-7 space-y-4">
                        {[5, 4, 3, 2, 1].map(
                            (rating) => {
                                const count =
                                    statistics.stars[
                                        rating
                                        ] || 0

                                const percentage =
                                    statistics.total
                                        ? Math.round(
                                            (count /
                                                statistics.total) *
                                            100
                                        )
                                        : 0

                                return (
                                    <div
                                        key={rating}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="w-10 shrink-0 text-sm font-semibold text-zinc-700">
                                            {rating} ★
                                        </span>

                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                            <div
                                                className="h-full rounded-full bg-amber-400 transition-all"
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />
                                        </div>

                                        <span className="w-8 shrink-0 text-right text-sm font-medium text-zinc-500">
                                            {count}
                                        </span>
                                    </div>
                                )
                            }
                        )}
                    </div>
                </section>

                {/* Experience questions */}
                <section className="rounded-2xl border border-[#eadfd4] bg-white p-5 shadow-[0_4px_20px_rgba(60,30,20,0.04)] sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                            Experience
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-zinc-950">
                            Customer experience
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                            Responses to the post-delivery questions.
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <QuestionResult
                            label="Was ordering easy?"
                            yes={
                                statistics.easyYes
                            }
                            no={
                                statistics.easyNo
                            }
                        />

                        <QuestionResult
                            label="Was live tracking useful?"
                            yes={
                                statistics.trackingYes
                            }
                            no={
                                statistics.trackingNo
                            }
                        />
                    </div>
                </section>
            </div>

            {/* Customer responses */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-[#eadfd4] bg-white shadow-[0_4px_20px_rgba(60,30,20,0.04)]">
                <div className="border-b border-[#eadfd4] px-5 py-5 sm:px-6">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                        Recent feedback
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-zinc-950">
                        Customer responses
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                        Most recent delivery feedback.
                    </p>
                </div>

                {loading ? (
                    <div className="flex min-h-[320px] items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-zinc-200" />

                            <p className="mt-4 text-sm font-medium text-zinc-500">
                                Loading feedback...
                            </p>
                        </div>
                    </div>
                ) : feedback.length === 0 ? (
                    <div className="flex min-h-[320px] items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-400">
                                ★
                            </div>

                            <p className="mt-5 font-bold text-zinc-950">
                                No feedback yet
                            </p>

                            <p className="mt-2 text-sm leading-6 text-zinc-500">
                                Customer responses will appear here after deliveries are completed.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-[#eee7e1]">
                        {feedback.map((item) => {
                            const customer =
                                profiles[
                                    item.customer_id
                                    ]

                            const order =
                                orders[
                                    item.order_id
                                    ]

                            return (
                                <article
                                    key={item.id}
                                    className="p-5 transition hover:bg-[#fffdfb] sm:p-6"
                                >
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                        {/* Customer */}
                                        <div className="flex min-w-0 gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff1ed] text-sm font-bold text-[#ed1c24]">
                                                {(
                                                    customer?.name ||
                                                    'C'
                                                )
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <StarRating
                                                        rating={Number(
                                                            item.rating
                                                        )}
                                                    />

                                                    <span className="text-sm font-bold text-zinc-800">
                                                        {Number(
                                                            item.rating
                                                        )}{' '}
                                                        / 5
                                                    </span>
                                                </div>

                                                <p className="mt-3 font-bold text-zinc-950">
                                                    {customer?.name ||
                                                        'Customer'}
                                                </p>

                                                <p className="mt-1 truncate text-xs text-zinc-500">
                                                    {customer?.phone ||
                                                        customer?.email ||
                                                        'No contact information'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Order/date */}
                                        <div className="lg:text-right">
                                            <p className="text-sm font-bold text-zinc-800">
                                                #
                                                {item.order_id?.slice(
                                                    0,
                                                    8
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs text-zinc-500">
                                                {formatDate(
                                                    item.created_at
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Order route */}
                                    {order && (
                                        <div className="mt-5 rounded-2xl border border-[#eee7e1] bg-[#faf8f6] p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                                                Delivery route
                                            </p>

                                            <p className="mt-2 text-sm font-medium leading-6 text-zinc-900">
                                                {order.pickup_address}
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                                                →{' '}
                                                {
                                                    order.destination_address
                                                }
                                            </p>
                                        </div>
                                    )}

                                    {/* Feedback tags */}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span
                                            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                                                item.ordering_easy
                                                    ? 'border-green-200 bg-green-50 text-green-700'
                                                    : 'border-red-200 bg-red-50 text-red-700'
                                            }`}
                                        >
                                            Ordering:{' '}
                                            {item.ordering_easy
                                                ? 'Easy'
                                                : 'Not easy'}
                                        </span>

                                        <span
                                            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                                                item.tracking_useful
                                                    ? 'border-green-200 bg-green-50 text-green-700'
                                                    : 'border-red-200 bg-red-50 text-red-700'
                                            }`}
                                        >
                                            Tracking:{' '}
                                            {item.tracking_useful
                                                ? 'Useful'
                                                : 'Not useful'}
                                        </span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}