'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import AdminLiveMap from '../../components/admin/AdminLiveMap'

const ACTIVE_STATUSES = [
    'ASSIGNED',
    'PICKING_UP',
    'PICKED_UP',
    'ON_THE_WAY',
]

const WAITING_STATUSES = [
    'PENDING_RIDER',
    'NEEDS_ADMIN_INTERVENTION',
]

function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(0)}`
}

function formatDate() {
    return new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function riderStatusLabel(status) {
    if (status === 'available') return 'Available'
    if (status === 'busy') return 'On delivery'
    return 'Offline'
}

function riderStatusStyle(status) {
    if (status === 'available') {
        return 'bg-green-50 text-green-700'
    }

    if (status === 'busy') {
        return 'bg-amber-50 text-amber-700'
    }

    return 'bg-zinc-100 text-zinc-500'
}

export default function AdminPage() {
    const [stats, setStats] = useState({
        today: 0,
        completed: 0,
        active: 0,
        waiting: 0,
        revenue: 0,
    })

    const [activeOrders, setActiveOrders] = useState([])
    const [riders, setRiders] = useState([])
    const [interventionCount, setInterventionCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [interventionError, setInterventionError] = useState('')

    async function checkInterventions() {
        try {
            setInterventionError('')

            const response = await fetch('/api/admin/interventions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result?.error || 'Unable to check interventions.'
                )
            }

            return result
        } catch (err) {
            console.error('Intervention check failed:', err)

            setInterventionError(
                err?.message || 'Unable to check interventions.'
            )
        }
    }

    async function loadDashboard() {
        const supabase = createClient()

        try {
            setError('')

            /*
             * Today's orders
             */
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            const {
                count: todayCount,
                error: todayError,
            } = await supabase
                .from('orders')
                .select('*', {
                    count: 'exact',
                    head: true,
                })
                .gte(
                    'created_at',
                    startOfToday.toISOString()
                )

            if (todayError) throw todayError

            /*
             * Completed orders
             */
            const {
                count: completedCount,
                error: completedError,
            } = await supabase
                .from('orders')
                .select('*', {
                    count: 'exact',
                    head: true,
                })
                .eq('status', 'DELIVERED')

            if (completedError) throw completedError

            /*
             * Active orders
             */
            const {
                data: activeData,
                error: activeError,
            } = await supabase
                .from('orders')
                .select(`
                    id,
                    customer_id,
                    rider_id,
                    pickup_address,
                    destination_address,
                    delivery_type,
                    recipient_name,
                    recipient_phone,
                    delivery_fee,
                    status,
                    created_at,
                    accepted_at
                `)
                .in('status', ACTIVE_STATUSES)
                .order('created_at', {
                    ascending: false,
                })

            if (activeError) throw activeError

            /*
             * Waiting orders
             */
            const {
                count: waitingCount,
                error: waitingError,
            } = await supabase
                .from('orders')
                .select('*', {
                    count: 'exact',
                    head: true,
                })
                .in('status', WAITING_STATUSES)

            if (waitingError) throw waitingError

            /*
             * Orders requiring intervention
             */
            const {
                count: interventionCountValue,
                error: interventionCountError,
            } = await supabase
                .from('orders')
                .select('*', {
                    count: 'exact',
                    head: true,
                })
                .eq(
                    'status',
                    'NEEDS_ADMIN_INTERVENTION'
                )

            if (interventionCountError) {
                throw interventionCountError
            }

            /*
             * Today's delivery revenue
             */
            const {
                data: revenueData,
                error: revenueError,
            } = await supabase
                .from('orders')
                .select('delivery_fee')
                .eq('status', 'DELIVERED')
                .gte(
                    'created_at',
                    startOfToday.toISOString()
                )

            if (revenueError) throw revenueError

            const revenue = (revenueData || []).reduce(
                (total, order) =>
                    total + Number(order.delivery_fee || 0),
                0
            )

            /*
             * Riders
             */
            const {
                data: riderData,
                error: riderError,
            } = await supabase
                .from('riders')
                .select(`
                    id,
                    user_id,
                    availability_status,
                    updated_at
                `)
                .order('availability_status', {
                    ascending: true,
                })

            if (riderError) throw riderError

            /*
             * Rider profiles
             */
            let ridersWithProfiles = riderData || []

            if (ridersWithProfiles.length > 0) {
                const userIds = ridersWithProfiles.map(
                    (rider) => rider.user_id
                )

                const {
                    data: profiles,
                    error: profileError,
                } = await supabase
                    .from('profiles')
                    .select('id, name, phone')
                    .in('id', userIds)

                if (profileError) {
                    throw profileError
                }

                ridersWithProfiles =
                    ridersWithProfiles.map((rider) => ({
                        ...rider,
                        profile:
                            profiles?.find(
                                (profile) =>
                                    profile.id === rider.user_id
                            ) || null,
                    }))
            }

            /*
             * Update dashboard state
             */
            setStats({
                today: todayCount || 0,
                completed: completedCount || 0,
                active: activeData?.length || 0,
                waiting: waitingCount || 0,
                revenue,
            })

            setInterventionCount(
                interventionCountValue || 0
            )

            setActiveOrders(activeData || [])
            setRiders(ridersWithProfiles)
        } catch (err) {
            console.error('Admin dashboard error:', err)

            setError(
                err?.message ||
                'Unable to load dashboard data.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDashboard()
        checkInterventions()

        const supabase = createClient()

        const channel = supabase
            .channel('admin-dashboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                () => {
                    loadDashboard()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'riders',
                },
                () => {
                    loadDashboard()
                }
            )
            .subscribe()

        /*
         * Intervention check every minute
         */
        const interventionInterval = setInterval(() => {
            checkInterventions()
            loadDashboard()
        }, 60 * 1000)

        /*
         * Normal dashboard refresh
         */
        const dashboardInterval = setInterval(() => {
            loadDashboard()
        }, 15 * 1000)

        return () => {
            clearInterval(interventionInterval)
            clearInterval(dashboardInterval)
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="mx-auto max-w-[1440px]">
            {/* PAGE HEADER */}
            <div className="mb-7">
                <div>
                    <p className="mt-1 text-base text-zinc-500">
                        {formatDate()} · Mutare
                    </p>
                </div>
            </div>

            {/* ERRORS */}
            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {interventionError && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Intervention check: {interventionError}
                </div>
            )}

            {/* STATS */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    label="TODAY'S ORDERS"
                    value={
                        loading
                            ? '—'
                            : stats.today
                    }
                />

                <StatCard
                    label="COMPLETED"
                    value={
                        loading
                            ? '—'
                            : stats.completed
                    }
                />

                <StatCard
                    label="ACTIVE"
                    value={
                        loading
                            ? '—'
                            : stats.active
                    }
                />

                <StatCard
                    label="WAITING"
                    value={
                        loading
                            ? '—'
                            : stats.waiting
                    }
                />

                <StatCard
                    label="DELIVERY REVENUE"
                    value={
                        loading
                            ? '—'
                            : formatCurrency(
                                stats.revenue
                            )
                    }
                />
            </div>

            {/* ACTION REQUIRED */}
            {interventionCount > 0 && (
                <div className="mt-5 flex items-center justify-between gap-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                    <div>
                        <p className="flex items-center gap-2 text-lg font-bold text-red-700">
                            <span>⚠</span>
                            ACTION REQUIRED
                        </p>

                        <p className="mt-1 text-sm text-red-700">
                            {interventionCount === 1
                                ? 'Order'
                                : `${interventionCount} orders`}{' '}
                            {interventionCount === 1
                                ? 'has'
                                : 'have'}{' '}
                            not been accepted for 30 minutes.
                        </p>
                    </div>

                    <a
                        href="/admin/orders"
                        className="shrink-0 rounded-xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600"
                    >
                        INTERVENE
                    </a>
                </div>
            )}

            {/* MAIN OPERATIONS AREA */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.8fr)]">
                {/* LIVE MAP */}
                <section className="overflow-hidden rounded-2xl border border-[#eadfd4] bg-white">
                    <div className="flex items-center justify-between border-b border-[#eadfd4] px-5 py-4">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-950">
                                LIVE OPERATIONS MAP
                            </h3>

                            <p className="mt-0.5 text-sm text-zinc-500">
                                Active riders and delivery movement
                            </p>
                        </div>

                        <span className="text-sm text-zinc-500">
                            Simulated
                        </span>
                    </div>

                    <AdminLiveMap
                        orders={activeOrders}
                        className="h-[460px]"
                    />
                </section>

                {/* RIDERS */}
                <section className="rounded-2xl border border-[#eadfd4] bg-white">
                    <div className="flex items-center justify-between border-b border-[#eadfd4] px-5 py-4">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-950">
                                RIDERS
                            </h3>

                            <p className="mt-0.5 text-sm text-zinc-500">
                                Current rider availability
                            </p>
                        </div>

                        <span className="text-sm text-zinc-500">
                            {riders.length} total
                        </span>
                    </div>

                    <div className="px-5">
                        {loading ? (
                            <div className="py-6 text-sm text-zinc-500">
                                Loading riders...
                            </div>
                        ) : riders.length === 0 ? (
                            <div className="py-6 text-sm text-zinc-500">
                                No riders registered yet.
                            </div>
                        ) : (
                            riders.map((rider) => (
                                <div
                                    key={rider.id}
                                    className="flex items-center justify-between gap-4 border-b border-[#eadfd4] py-5 last:border-b-0"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-zinc-950">
                                            {rider.profile?.name ||
                                                'Rider'}
                                        </p>

                                        <p className="mt-0.5 text-sm text-zinc-500">
                                            {rider.availability_status ===
                                            'busy'
                                                ? 'On delivery'
                                                : rider.availability_status ===
                                                'available'
                                                    ? 'Available'
                                                    : 'Offline'}
                                        </p>
                                    </div>

                                    <span
                                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${riderStatusStyle(
                                            rider.availability_status
                                        )}`}
                                    >
                                        {riderStatusLabel(
                                            rider.availability_status
                                        )}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-[#eadfd4] bg-white px-5 py-5">
            <p className="text-xs font-bold tracking-wide text-zinc-500">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
                {value}
            </p>
        </div>
    )
}