'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

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

function availabilityLabel(status) {
    if (status === 'available') return 'Available'
    if (status === 'busy') return 'Busy'
    return 'Offline'
}

function availabilityStyle(status) {
    if (status === 'available') {
        return 'bg-green-50 text-green-700 border-green-200'
    }

    if (status === 'busy') {
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }

    return 'bg-zinc-100 text-zinc-500 border-zinc-200'
}

function availabilityDot(status) {
    if (status === 'available') return 'bg-green-500'
    if (status === 'busy') return 'bg-amber-500'
    return 'bg-zinc-400'
}

function formatDate(dateString) {
    if (!dateString) return '—'

    return new Date(dateString).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function formatCoordinate(value) {
    if (value === null || value === undefined) {
        return '—'
    }

    return Number(value).toFixed(5)
}

function normalizeZimbabwePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '')

    if (!/^07\d{8}$/.test(digits)) {
        return null
    }

    return `+263${digits.slice(1)}`
}

export default function AdminRidersPage() {
    const [riders, setRiders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Rider invitation state
    const [showAddRider, setShowAddRider] = useState(false)
    const [creatingRider, setCreatingRider] = useState(false)
    const [inviteError, setInviteError] = useState('')
    const [invitation, setInvitation] = useState(null)
    const [riderName, setRiderName] = useState('')
    const [riderPhone, setRiderPhone] = useState('')
    const [riderEmail, setRiderEmail] = useState('')

    async function loadRiders() {
        const supabase = createClient()

        try {
            setError('')

            /*
             * Load all riders.
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

            if (riderError) {
                throw riderError
            }

            const loadedRiders = riderData || []

            if (loadedRiders.length === 0) {
                setRiders([])
                return
            }

            /*
             * Load rider profiles.
             */
            const userIds = loadedRiders
                .map((rider) => rider.user_id)
                .filter(Boolean)

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
                .in('id', userIds)

            if (profileError) {
                throw profileError
            }

            const profiles = {}

            for (const profile of profileData || []) {
                profiles[profile.id] = profile
            }

            /*
             * Load active deliveries.
             */
            const {
                data: activeOrders,
                error: activeOrdersError,
            } = await supabase
                .from('orders')
                .select(`
                    id,
                    rider_id,
                    pickup_address,
                    destination_address,
                    status,
                    created_at,
                    accepted_at
                `)
                .in('status', ACTIVE_STATUSES)

            if (activeOrdersError) {
                throw activeOrdersError
            }

            const activeByRider = {}

            for (const order of activeOrders || []) {
                if (order.rider_id) {
                    activeByRider[order.rider_id] = order
                }
            }

            /*
             * Load completed delivery counts.
             */
            const {
                data: completedOrders,
                error: completedError,
            } = await supabase
                .from('orders')
                .select('rider_id')
                .eq('status', 'DELIVERED')
                .not('rider_id', 'is', null)

            if (completedError) {
                throw completedError
            }

            const completedByRider = {}

            for (const order of completedOrders || []) {
                completedByRider[order.rider_id] =
                    (completedByRider[order.rider_id] || 0) + 1
            }

            /*
             * Load latest location for each rider.
             */
            const riderIds = loadedRiders.map(
                (rider) => rider.id
            )

            const {
                data: locationData,
                error: locationError,
            } = await supabase
                .from('rider_locations')
                .select(`
                    rider_id,
                    order_id,
                    latitude,
                    longitude,
                    updated_at
                `)
                .in('rider_id', riderIds)
                .order('updated_at', {
                    ascending: false,
                })

            if (locationError) {
                throw locationError
            }

            const latestLocations = {}

            for (const location of locationData || []) {
                if (latestLocations[location.rider_id]) {
                    continue
                }

                latestLocations[location.rider_id] = location
            }

            /*
             * Combine everything into one rider record.
             */
            const combined = loadedRiders.map((rider) => ({
                ...rider,
                profile:
                    profiles[rider.user_id] || null,
                activeOrder:
                    activeByRider[rider.id] || null,
                completedCount:
                    completedByRider[rider.id] || 0,
                latestLocation:
                    latestLocations[rider.id] || null,
            }))

            setRiders(combined)
        } catch (err) {
            console.error('Admin riders error:', err)

            setError(
                err?.message ||
                'Unable to load riders.'
            )
        } finally {
            setLoading(false)
        }
    }

    /*
     * Create rider invitation.
     */
    async function handleCreateRider(e) {
        e.preventDefault()

        setCreatingRider(true)
        setInviteError('')
        setInvitation(null)

        const normalizedPhone =
            normalizeZimbabwePhone(riderPhone)

        if (!normalizedPhone) {
            setInviteError(
                'Please enter a valid Zimbabwe mobile number, e.g. 0771234567.'
            )

            setCreatingRider(false)
            return
        }

        try {
            const response = await fetch(
                '/api/admin/riders/invite',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        name: riderName.trim(),
                        phone: riderPhone,
                        email: riderEmail.trim(),
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    'Unable to create rider invitation.'
                )
            }

            setInvitation(result.invitation)

            setRiderName('')
            setRiderPhone('')
            setRiderEmail('')

            await loadRiders()
        } catch (err) {
            console.error(
                'Create rider error:',
                err
            )

            setInviteError(
                err?.message ||
                'Unable to create rider invitation.'
            )
        } finally {
            setCreatingRider(false)
        }
    }

    function closeAddRider() {
        if (creatingRider) return

        setShowAddRider(false)
        setInvitation(null)
        setInviteError('')
        setRiderName('')
        setRiderPhone('')
        setRiderEmail('')
    }

    async function copyInviteLink() {
        if (!invitation?.inviteUrl) return

        try {
            await navigator.clipboard.writeText(
                invitation.inviteUrl
            )
        } catch (err) {
            console.error(
                'Copy invitation link failed:',
                err
            )
        }
    }

    function openWhatsApp() {
        if (!invitation) return

        const message =
            `Hi ${invitation.name}, your KwiQue Delivery rider account has been created.\n\n` +
            `Please use this link to activate your account and create your password:\n` +
            `${invitation.inviteUrl}\n\n` +
            `This invitation expires in 48 hours.`

        const whatsappUrl =
            `https://wa.me/${invitation.phone.replace(/\D/g, '')}` +
            `?text=${encodeURIComponent(message)}`

        window.open(
            whatsappUrl,
            '_blank',
            'noopener,noreferrer'
        )
    }

    function openEmail() {
        if (!invitation) return

        const subject =
            'KwiQue Delivery Rider Account Invitation'

        const body =
            `Hi ${invitation.name},\n\n` +
            `Your KwiQue Delivery rider account has been created.\n\n` +
            `Please use the link below to activate your account and create your password:\n` +
            `${invitation.inviteUrl}\n\n` +
            `This invitation expires in 48 hours.\n\n` +
            `KwiQue Delivery`

        window.location.href =
            `mailto:${invitation.email}` +
            `?subject=${encodeURIComponent(subject)}` +
            `&body=${encodeURIComponent(body)}`
    }

    /*
     * Initial load + realtime updates.
     */
    useEffect(() => {
        loadRiders()

        const supabase = createClient()

        const channel = supabase
            .channel('admin-riders')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'riders',
                },
                () => {
                    loadRiders()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                () => {
                    loadRiders()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rider_locations',
                },
                () => {
                    loadRiders()
                }
            )
            .subscribe()

        const interval = setInterval(() => {
            loadRiders()
        }, 15000)

        return () => {
            clearInterval(interval)
            supabase.removeChannel(channel)
        }
    }, [])

    const availableCount = riders.filter(
        (rider) =>
            rider.availability_status ===
            'available'
    ).length

    const busyCount = riders.filter(
        (rider) =>
            rider.availability_status === 'busy'
    ).length

    const offlineCount = riders.filter(
        (rider) =>
            rider.availability_status === 'offline'
    ).length

    return (
        <div className="mx-auto w-full max-w-[1500px]">
            {/* Header */}
            <section className="mb-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a6259]">
                            Operations
                        </p>

                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                            Riders
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                            Monitor rider availability and active deliveries.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-2xl border border-[#eadfd4] bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                                Total riders
                            </p>

                            <p className="mt-1 text-xl font-bold text-zinc-950">
                                {loading
                                    ? '—'
                                    : riders.length}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowAddRider(true)
                            }
                            className="rounded-2xl bg-[#ed1c24] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(237,28,36,0.15)] transition hover:bg-[#d91820]"
                        >
                            + Add Rider
                        </button>
                    </div>
                </div>
            </section>

            {/* Error */}
            {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {/* Summary */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <SummaryCard
                    label="Available"
                    value={
                        loading
                            ? '—'
                            : availableCount
                    }
                    dot="bg-green-500"
                />

                <SummaryCard
                    label="Busy"
                    value={
                        loading
                            ? '—'
                            : busyCount
                    }
                    dot="bg-amber-500"
                />

                <SummaryCard
                    label="Offline"
                    value={
                        loading
                            ? '—'
                            : offlineCount
                    }
                    dot="bg-zinc-400"
                />
            </div>

            {/* Riders */}
            {loading ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-[#eadfd4] bg-white">
                    <div className="text-center">
                        <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-zinc-200" />

                        <p className="mt-4 text-sm font-medium text-zinc-500">
                            Loading riders...
                        </p>
                    </div>
                </div>
            ) : riders.length === 0 ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-[#eadfd4] bg-white p-6">
                    <div className="max-w-sm text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-xl font-bold text-zinc-400">
                            R
                        </div>

                        <p className="mt-5 text-lg font-bold text-zinc-950">
                            No riders registered
                        </p>

                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                            Riders will appear here once they are added to KwiQue.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setShowAddRider(true)
                            }
                            className="mt-6 rounded-xl bg-[#ed1c24] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d91820]"
                        >
                            Add your first rider
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {riders.map((rider) => {
                        const order =
                            rider.activeOrder

                        const location =
                            rider.latestLocation

                        const riderName =
                            rider.profile?.name ||
                            'Rider'

                        return (
                            <section
                                key={rider.id}
                                className="overflow-hidden rounded-2xl border border-[#eadfd4] bg-white shadow-[0_4px_20px_rgba(60,30,20,0.04)]"
                            >
                                {/* Rider header */}
                                <div className="border-b border-[#eadfd4] p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff1ed] text-base font-bold text-[#ed1c24]">
                                                {riderName
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-bold text-zinc-950">
                                                    {riderName}
                                                </h3>

                                                <p className="mt-1 truncate text-sm text-zinc-500">
                                                    {rider.profile?.phone ||
                                                        rider.profile?.email ||
                                                        'No contact information'}
                                                </p>
                                            </div>
                                        </div>

                                        <span
                                            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${availabilityStyle(
                                                rider.availability_status
                                            )}`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${availabilityDot(
                                                    rider.availability_status
                                                )}`}
                                            />

                                            {availabilityLabel(
                                                rider.availability_status
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Rider stats */}
                                <div className="grid gap-3 p-5 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-[#eee7e1] bg-[#faf8f6] p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                                            Current delivery
                                        </p>

                                        {order ? (
                                            <>
                                                <p className="mt-2 font-bold text-zinc-950">
                                                    #
                                                    {order.id.slice(
                                                        0,
                                                        8
                                                    )}
                                                </p>

                                                <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                                                    {STATUS_LABELS[
                                                            order
                                                                .status
                                                            ] ||
                                                        order.status}
                                                </span>
                                            </>
                                        ) : (
                                            <p className="mt-2 text-sm text-zinc-500">
                                                No active delivery
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-[#eee7e1] bg-[#faf8f6] p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                                            Completed
                                        </p>

                                        <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
                                            {
                                                rider.completedCount
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-zinc-500">
                                            Total delivered
                                        </p>
                                    </div>
                                </div>

                                {/* Current route */}
                                {order && (
                                    <div className="border-t border-[#eadfd4] px-5 py-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                                            Current route
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

                                {/* Location */}
                                <div className="border-t border-[#eadfd4] p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                                                Last location
                                            </p>

                                            {location ? (
                                                <p className="mt-2 font-mono text-sm text-zinc-800">
                                                    {formatCoordinate(
                                                        location.latitude
                                                    )}
                                                    ,{' '}
                                                    {formatCoordinate(
                                                        location.longitude
                                                    )}
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-sm text-zinc-500">
                                                    No GPS location yet
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <p className="text-xs text-zinc-400">
                                                Last updated
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-zinc-700">
                                                {formatDate(
                                                    location?.updated_at ||
                                                    rider.updated_at
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )
                    })}
                </div>
            )}

            {/* Add Rider Modal */}
            {showAddRider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-[2px]">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[26px] border border-[#eadfd4] bg-white shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-start justify-between gap-4 border-b border-[#eadfd4] px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a6259]">
                                    Rider management
                                </p>

                                <h3 className="mt-1 text-xl font-bold tracking-tight text-zinc-950">
                                    {invitation
                                        ? 'Rider invitation created'
                                        : 'Add rider'}
                                </h3>

                                <p className="mt-1 text-sm leading-5 text-zinc-500">
                                    {invitation
                                        ? 'Share the invitation with the rider.'
                                        : 'Create a rider profile and generate a secure activation link.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeAddRider
                                }
                                disabled={
                                    creatingRider
                                }
                                className="rounded-xl p-2 text-xl leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {!invitation ? (
                            <form
                                onSubmit={
                                    handleCreateRider
                                }
                                className="p-6"
                            >
                                <div className="space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-zinc-900">
                                            Full name
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                riderName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setRiderName(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#ed1c24]/40 focus:ring-4 focus:ring-[#ed1c24]/10"
                                            placeholder="Rider full name"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-zinc-900">
                                            Phone number
                                        </label>

                                        <input
                                            type="tel"
                                            value={
                                                riderPhone
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setRiderPhone(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#ed1c24]/40 focus:ring-4 focus:ring-[#ed1c24]/10"
                                            placeholder="0771234567"
                                            inputMode="numeric"
                                            required
                                        />

                                        <p className="mt-2 text-xs text-zinc-500">
                                            Zimbabwe mobile number
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-zinc-900">
                                            Email address
                                        </label>

                                        <input
                                            type="email"
                                            value={
                                                riderEmail
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setRiderEmail(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#ed1c24]/40 focus:ring-4 focus:ring-[#ed1c24]/10"
                                            placeholder="rider@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {inviteError && (
                                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
                                        {inviteError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        creatingRider
                                    }
                                    className="mt-6 w-full rounded-xl bg-[#ed1c24] px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(237,28,36,0.15)] transition hover:bg-[#d91820] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {creatingRider
                                        ? 'Creating rider...'
                                        : 'Create Rider'}
                                </button>
                            </form>
                        ) : (
                            <div className="p-6">
                                <div className="rounded-2xl border border-[#eadfd4] bg-[#faf8f6] p-4">
                                    <p className="font-bold text-zinc-950">
                                        {
                                            invitation.name
                                        }
                                    </p>

                                    <p className="mt-1 text-sm text-zinc-500">
                                        {
                                            invitation.phone
                                        }
                                    </p>

                                    <p className="text-sm text-zinc-500">
                                        {
                                            invitation.email
                                        }
                                    </p>
                                </div>

                                <div className="mt-5">
                                    <p className="mb-2 text-sm font-semibold text-zinc-900">
                                        Invitation link
                                    </p>

                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                                        <p className="break-all text-xs leading-5 text-zinc-600">
                                            {
                                                invitation.inviteUrl
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                                    <p className="text-xs leading-5 text-amber-800">
                                        This invitation expires in 48 hours and can only be used once.
                                    </p>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={
                                            copyInviteLink
                                        }
                                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                    >
                                        Copy Link
                                    </button>

                                    <button
                                        type="button"
                                        onClick={
                                            openWhatsApp
                                        }
                                        className="rounded-xl bg-[#ed1c24] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#d91820]"
                                    >
                                        WhatsApp
                                    </button>

                                    <button
                                        type="button"
                                        onClick={
                                            openEmail
                                        }
                                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                    >
                                        Email
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeAddRider
                                    }
                                    className="mt-3 w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function SummaryCard({
                         label,
                         value,
                         dot,
                     }) {
    return (
        <div className="rounded-2xl border border-[#eadfd4] bg-white p-5 shadow-[0_4px_20px_rgba(60,30,20,0.04)]">
            <div className="flex items-center gap-2">
                <span
                    className={`h-2 w-2 rounded-full ${dot}`}
                />

                <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                    {label}
                </p>
            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">
                {value}
            </p>
        </div>
    )
}