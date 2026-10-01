'use client'

import { useEffect, useState } from 'react'

function formatDate(dateString) {
    if (!dateString) return '—'

    return new Date(
        dateString
    ).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
                {value}
            </p>
        </div>
    )
}

export default function RiderActivity() {
    const [stats, setStats] = useState({
        today: 0,
        week: 0,
        total: 0,
    })

    const [deliveries, setDeliveries] =
        useState([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState('')

    async function loadHistory() {
        try {
            setError('')

            const response = await fetch(
                '/api/rider/history'
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to load activity.'
                )
            }

            setStats(
                data.stats || {
                    today: 0,
                    week: 0,
                    total: 0,
                }
            )

            setDeliveries(
                data.deliveries || []
            )
        } catch (error) {
            console.error(
                'Rider activity error:',
                error
            )

            setError(
                error.message ||
                'Unable to load activity.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadHistory()
    }, [])

    return (
        <section className="mt-10">
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-sm text-gray-400">
                        Your activity
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                        Activity
                    </h2>
                </div>

                <button
                    onClick={loadHistory}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="mt-5 grid grid-cols-3 gap-3">
                <StatCard
                    label="Today"
                    value={
                        loading
                            ? '—'
                            : stats.today
                    }
                />

                <StatCard
                    label="This week"
                    value={
                        loading
                            ? '—'
                            : stats.week
                    }
                />

                <StatCard
                    label="Completed"
                    value={
                        loading
                            ? '—'
                            : stats.total
                    }
                />
            </div>

            {/* History */}
            <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300">
                    Delivery history
                </h3>

                {loading ? (
                    <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500">
                        Loading activity...
                    </div>
                ) : deliveries.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
                        <p className="font-medium text-gray-300">
                            No completed deliveries yet
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                            Completed deliveries will
                            appear here.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {deliveries.map(
                            (delivery) => (
                                <article
                                    key={
                                        delivery.id
                                    }
                                    className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">
                                                {
                                                    delivery.delivery_type
                                                }
                                            </p>

                                            <p className="mt-1 font-medium text-gray-200">
                                                #
                                                {delivery.id.slice(
                                                    0,
                                                    8
                                                )}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                                            Delivered
                                        </span>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Pickup
                                            </p>

                                            <p className="mt-1 text-sm text-gray-300">
                                                {
                                                    delivery.pickup_address
                                                }
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Destination
                                            </p>

                                            <p className="mt-1 text-sm text-gray-300">
                                                {
                                                    delivery.destination_address
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
                                        <p className="text-xs text-gray-500">
                                            {formatDate(
                                                delivery.delivered_at
                                            )}
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            {Number(
                                                delivery.distance_km ||
                                                0
                                            ).toFixed(
                                                2
                                            )}{' '}
                                            km
                                        </p>
                                    </div>
                                </article>
                            )
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}