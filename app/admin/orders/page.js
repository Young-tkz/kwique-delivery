'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

const STATUS_OPTIONS = [
    'ALL',
    'PENDING_RIDER',
    'ASSIGNED',
    'PICKING_UP',
    'PICKED_UP',
    'ON_THE_WAY',
    'DELIVERED',
    'CANCELLED',
    'NEEDS_ADMIN_INTERVENTION',
]

const STATUS_LABELS = {
    PENDING_RIDER: 'Finding rider',
    ASSIGNED: 'Assigned',
    PICKING_UP: 'Picking up',
    PICKED_UP: 'Picked up',
    ON_THE_WAY: 'On the way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    NEEDS_ADMIN_INTERVENTION: 'Needs intervention',
}

const STATUS_STYLES = {
    PENDING_RIDER: 'bg-blue-50 text-blue-700',
    ASSIGNED: 'bg-indigo-50 text-indigo-700',
    PICKING_UP: 'bg-amber-50 text-amber-700',
    PICKED_UP: 'bg-purple-50 text-purple-700',
    ON_THE_WAY: 'bg-green-50 text-green-700',
    DELIVERED: 'bg-zinc-100 text-zinc-600',
    CANCELLED: 'bg-red-50 text-red-700',
    NEEDS_ADMIN_INTERVENTION: 'bg-red-100 text-red-800',
}

function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`
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

function getShortId(id) {
    return id ? `#${id.slice(0, 8)}` : '—'
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([])
    const [riders, setRiders] = useState({})
    const [profiles, setProfiles] = useState({})

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [riderModalOpen, setRiderModalOpen] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [actionType, setActionType] = useState(null)
    const [availableRiders, setAvailableRiders] = useState([])
    const [loadingRiders, setLoadingRiders] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState('')
    const [actionSuccess, setActionSuccess] = useState('')

    async function loadOrders() {
        const supabase = createClient()

        try {
            setError('')

            const { data: orderData, error: orderError } =
                await supabase
                    .from('orders')
                    .select(`
                        id,
                        customer_id,
                        rider_id,
                        pickup_address,
                        destination_address,
                        delivery_type,
                        package_details,
                        recipient_name,
                        recipient_phone,
                        distance_km,
                        delivery_fee,
                        status,
                        created_at,
                        accepted_at,
                        picked_up_at,
                        delivered_at
                    `)
                    .order('created_at', {
                        ascending: false,
                    })

            if (orderError) {
                throw orderError
            }

            const loadedOrders = orderData || []

            setOrders(loadedOrders)

            const riderIds = [
                ...new Set(
                    loadedOrders
                        .map((order) => order.rider_id)
                        .filter(Boolean)
                ),
            ]

            if (riderIds.length > 0) {
                const {
                    data: riderData,
                    error: riderError,
                } = await supabase
                    .from('riders')
                    .select(
                        'id, user_id, availability_status'
                    )
                    .in('id', riderIds)

                if (riderError) {
                    throw riderError
                }

                const riderMap = {}

                for (const rider of riderData || []) {
                    riderMap[rider.id] = rider
                }

                setRiders(riderMap)

                const riderUserIds = [
                    ...new Set(
                        (riderData || [])
                            .map(
                                (rider) =>
                                    rider.user_id
                            )
                            .filter(Boolean)
                    ),
                ]

                if (riderUserIds.length > 0) {
                    const {
                        data: riderProfiles,
                        error: riderProfilesError,
                    } = await supabase
                        .from('profiles')
                        .select('id, name, phone')
                        .in('id', riderUserIds)

                    if (riderProfilesError) {
                        throw riderProfilesError
                    }

                    const profileMap = {}

                    for (const profile of riderProfiles || []) {
                        profileMap[profile.id] = profile
                    }

                    setProfiles((current) => ({
                        ...current,
                        ...profileMap,
                    }))
                }
            } else {
                setRiders({})
            }

            const customerIds = [
                ...new Set(
                    loadedOrders
                        .map(
                            (order) =>
                                order.customer_id
                        )
                        .filter(Boolean)
                ),
            ]

            if (customerIds.length > 0) {
                const {
                    data: customerProfiles,
                    error: customerProfilesError,
                } = await supabase
                    .from('profiles')
                    .select('id, name, phone')
                    .in('id', customerIds)

                if (customerProfilesError) {
                    throw customerProfilesError
                }

                const customerProfileMap = {}

                for (const profile of customerProfiles || []) {
                    customerProfileMap[profile.id] = profile
                }

                setProfiles((current) => ({
                    ...current,
                    ...customerProfileMap,
                }))
            }
        } catch (err) {
            console.error('Admin orders error:', err)

            setError(
                err?.message ||
                'Unable to load orders.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()

        const supabase = createClient()

        const channel = supabase
            .channel('admin-orders')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                () => {
                    loadOrders()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase()

        return orders.filter((order) => {
            const matchesStatus =
                statusFilter === 'ALL' ||
                order.status === statusFilter

            if (!matchesStatus) {
                return false
            }

            if (!query) {
                return true
            }

            const customer =
                profiles[order.customer_id]

            const riderRecord =
                order.rider_id
                    ? riders[order.rider_id]
                    : null

            const rider =
                riderRecord
                    ? profiles[riderRecord.user_id]
                    : null

            const searchable = [
                order.id,
                order.pickup_address,
                order.destination_address,
                order.recipient_name,
                order.recipient_phone,
                order.delivery_type,
                customer?.name,
                customer?.phone,
                rider?.name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return searchable.includes(query)
        })
    }, [
        orders,
        search,
        statusFilter,
        riders,
        profiles,
    ])

    const interventionCount = orders.filter(
        (order) =>
            order.status ===
            'NEEDS_ADMIN_INTERVENTION'
    ).length

    async function loadAvailableRiders() {
        const supabase = createClient()

        try {
            setLoadingRiders(true)
            setActionError('')

            const {
                data: riderData,
                error: riderError,
            } = await supabase
                .from('riders')
                .select(
                    'id, user_id, availability_status'
                )
                .eq(
                    'availability_status',
                    'available'
                )

            if (riderError) {
                throw riderError
            }

            const riderUserIds = [
                ...new Set(
                    (riderData || [])
                        .map(
                            (rider) =>
                                rider.user_id
                        )
                        .filter(Boolean)
                ),
            ]

            let profileMap = {}

            if (riderUserIds.length > 0) {
                const {
                    data: riderProfiles,
                    error: profileError,
                } = await supabase
                    .from('profiles')
                    .select('id, name, phone')
                    .in('id', riderUserIds)

                if (profileError) {
                    throw profileError
                }

                for (const profile of riderProfiles || []) {
                    profileMap[profile.id] = profile
                }
            }

            const ridersWithProfiles = (
                riderData || []
            ).map((rider) => ({
                ...rider,
                profile:
                    profileMap[rider.user_id] ||
                    null,
            }))

            setAvailableRiders(
                ridersWithProfiles
            )
        } catch (err) {
            console.error(
                'Failed to load available riders:',
                err
            )

            setActionError(
                err?.message ||
                'Unable to load available riders.'
            )
        } finally {
            setLoadingRiders(false)
        }
    }

    function openRiderModal(order, type) {
        setSelectedOrder(order)
        setActionType(type)
        setActionError('')
        setActionSuccess('')
        setRiderModalOpen(true)
        loadAvailableRiders()
    }

    function closeRiderModal() {
        if (actionLoading) return

        setRiderModalOpen(false)
        setSelectedOrder(null)
        setActionType(null)
        setAvailableRiders([])
        setActionError('')
        setActionSuccess('')
    }

    async function handleRiderAssignment(riderId) {
        if (!selectedOrder) return

        const supabase = createClient()

        try {
            setActionLoading(true)
            setActionError('')
            setActionSuccess('')

            const updateData = {
                rider_id: riderId,
            }

            if (actionType === 'assign') {
                updateData.status = 'ASSIGNED'
            }

            const { error: updateError } =
                await supabase
                    .from('orders')
                    .update(updateData)
                    .eq(
                        'id',
                        selectedOrder.id
                    )

            if (updateError) {
                throw updateError
            }

            setActionSuccess(
                actionType === 'assign'
                    ? 'Rider assigned successfully.'
                    : 'Delivery reassigned successfully.'
            )

            await loadOrders()

            setTimeout(() => {
                closeRiderModal()
            }, 700)
        } catch (err) {
            console.error(
                'Rider assignment error:',
                err
            )

            setActionError(
                err?.message ||
                'Unable to update rider assignment.'
            )
        } finally {
            setActionLoading(false)
        }
    }

    async function handleCancelDelivery(order) {
        const confirmed = window.confirm(
            `Cancel delivery ${getShortId(order.id)}?`
        )

        if (!confirmed) return

        const supabase = createClient()

        try {
            setError('')

            const { error: updateError } =
                await supabase
                    .from('orders')
                    .update({
                        status: 'CANCELLED',
                    })
                    .eq('id', order.id)

            if (updateError) {
                throw updateError
            }

            await loadOrders()
        } catch (err) {
            console.error(
                'Cancel delivery error:',
                err
            )

            setError(
                err?.message ||
                'Unable to cancel delivery.'
            )
        }
    }

    function canAssign(order) {
        return (
            order.status === 'PENDING_RIDER' ||
            order.status ===
            'NEEDS_ADMIN_INTERVENTION'
        )
    }

    function canReassign(order) {
        return (
            order.rider_id &&
            [
                'ASSIGNED',
                'PICKING_UP',
                'PICKED_UP',
                'ON_THE_WAY',
            ].includes(order.status)
        )
    }

    function canCancel(order) {
        return ![
            'DELIVERED',
            'CANCELLED',
        ].includes(order.status)
    }

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
                            Orders
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                            View and manage every delivery moving through KwiQue.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-[#eadfd4] bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                                Total orders
                            </p>

                            <p className="mt-1 text-xl font-bold text-zinc-950">
                                {loading ? '—' : orders.length}
                            </p>
                        </div>

                        {interventionCount > 0 && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                                    Attention
                                </p>

                                <p className="mt-1 text-xl font-bold text-red-700">
                                    {interventionCount}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Error */}
            {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {/* Controls */}
            <section className="mb-5 rounded-2xl border border-[#eadfd4] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                            placeholder="Search orders, customers, riders or addresses..."
                            className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#ed1c24]/40 focus:bg-white focus:ring-4 focus:ring-[#ed1c24]/10"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(
                            (status) => {
                                const active =
                                    statusFilter ===
                                    status

                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() =>
                                            setStatusFilter(
                                                status
                                            )
                                        }
                                        className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                                            active
                                                ? 'bg-zinc-950 text-white shadow-sm'
                                                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                                        }`}
                                    >
                                        {status ===
                                        'ALL'
                                            ? 'All'
                                            : STATUS_LABELS[
                                                status
                                                ]}
                                    </button>
                                )
                            }
                        )}
                    </div>
                </div>
            </section>

            {/* Orders */}
            <section className="overflow-hidden rounded-2xl border border-[#eadfd4] bg-white">
                <div className="flex flex-col gap-2 border-b border-[#eadfd4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-950">
                            Delivery orders
                        </h2>

                        <p className="mt-0.5 text-sm text-zinc-500">
                            {loading
                                ? 'Loading orders...'
                                : `${filteredOrders.length} ${
                                    filteredOrders.length ===
                                    1
                                        ? 'order'
                                        : 'orders'
                                } shown`}
                        </p>
                    </div>

                    {statusFilter !==
                        'ALL' && (
                            <button
                                type="button"
                                onClick={() =>
                                    setStatusFilter(
                                        'ALL'
                                    )
                                }
                                className="self-start rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 sm:self-auto"
                            >
                                Clear filter
                            </button>
                        )}
                </div>

                {loading ? (
                    <div className="px-5 py-16 text-center">
                        <p className="text-sm font-medium text-zinc-500">
                            Loading orders...
                        </p>
                    </div>
                ) : filteredOrders.length ===
                0 ? (
                    <div className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                            —
                        </div>

                        <h3 className="mt-4 text-base font-bold text-zinc-950">
                            No orders found
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                            Try changing the search or status filter.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px]">
                            <thead>
                            <tr className="border-b border-[#eadfd4] bg-[#faf8f6] text-left">
                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Order
                                </th>

                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Customer
                                </th>

                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Route
                                </th>

                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Rider
                                </th>

                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Status
                                </th>

                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Fee
                                </th>

                                <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Actions
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-[#eadfd4]">
                            {filteredOrders.map(
                                (order) => {
                                    const customer =
                                        profiles[
                                            order
                                                .customer_id
                                            ]

                                    const riderRecord =
                                        order.rider_id
                                            ? riders[
                                                order
                                                    .rider_id
                                                ]
                                            : null

                                    const rider =
                                        riderRecord
                                            ? profiles[
                                                riderRecord
                                                    .user_id
                                                ]
                                            : null

                                    return (
                                        <tr
                                            key={
                                                order.id
                                            }
                                            className="transition hover:bg-[#fffaf7]"
                                        >
                                            <td className="px-5 py-4 align-top">
                                                <p className="font-bold text-zinc-950">
                                                    {getShortId(
                                                        order.id
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-zinc-400">
                                                    {formatDate(
                                                        order.created_at
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 align-top">
                                                <p className="font-semibold text-zinc-900">
                                                    {customer
                                                            ?.name ||
                                                        order.recipient_name ||
                                                        'Customer'}
                                                </p>

                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {customer
                                                            ?.phone ||
                                                        order.recipient_phone ||
                                                        'No phone'}
                                                </p>
                                            </td>

                                            <td className="max-w-[280px] px-5 py-4 align-top">
                                                <p className="truncate text-sm font-medium text-zinc-900">
                                                    {order.pickup_address ||
                                                        '—'}
                                                </p>

                                                <p className="mt-1 truncate text-xs text-zinc-500">
                                                    →{' '}
                                                    {order.destination_address ||
                                                        '—'}
                                                </p>

                                                {order.distance_km !=
                                                    null && (
                                                        <p className="mt-2 text-xs font-medium text-zinc-400">
                                                            {Number(
                                                                order.distance_km
                                                            ).toFixed(
                                                                1
                                                            )}{' '}
                                                            km
                                                        </p>
                                                    )}
                                            </td>

                                            <td className="px-5 py-4 align-top">
                                                {rider ? (
                                                    <>
                                                        <p className="font-semibold text-zinc-900">
                                                            {
                                                                rider.name
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {rider.phone ||
                                                                'No phone'}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-zinc-400">
                                                            Unassigned
                                                        </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 align-top">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                                                            STATUS_STYLES[
                                                                order
                                                                    .status
                                                                ] ||
                                                            'bg-zinc-100 text-zinc-600'
                                                        }`}
                                                    >
                                                        {STATUS_LABELS[
                                                                order
                                                                    .status
                                                                ] ||
                                                            order.status}
                                                    </span>
                                            </td>

                                            <td className="px-5 py-4 align-top">
                                                <p className="font-bold text-zinc-950">
                                                    {formatCurrency(
                                                        order.delivery_fee
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 align-top">
                                                <div className="flex justify-end gap-2">
                                                    {canAssign(
                                                        order
                                                    ) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openRiderModal(
                                                                    order,
                                                                    'assign'
                                                                )
                                                            }
                                                            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
                                                        >
                                                            Assign rider
                                                        </button>
                                                    )}

                                                    {canReassign(
                                                        order
                                                    ) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openRiderModal(
                                                                    order,
                                                                    'reassign'
                                                                )
                                                            }
                                                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                                                        >
                                                            Reassign
                                                        </button>
                                                    )}

                                                    {canCancel(
                                                        order
                                                    ) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleCancelDelivery(
                                                                    order
                                                                )
                                                            }
                                                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}

                                                    {!canAssign(
                                                            order
                                                        ) &&
                                                        !canReassign(
                                                            order
                                                        ) &&
                                                        !canCancel(
                                                            order
                                                        ) && (
                                                            <span className="py-2 text-xs text-zinc-400">
                                                                    No actions
                                                                </span>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Rider assignment modal */}
            {riderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#eadfd4] bg-white shadow-2xl">
                        <div className="border-b border-[#eadfd4] px-5 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-zinc-950">
                                        {actionType ===
                                        'assign'
                                            ? 'Assign rider'
                                            : 'Reassign delivery'}
                                    </h3>

                                    <p className="mt-1 text-sm text-zinc-500">
                                        {selectedOrder
                                            ? getShortId(
                                                selectedOrder.id
                                            )
                                            : ''}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeRiderModal
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                    className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="text-xl leading-none">
                                        ×
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-5">
                            {actionError && (
                                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                                    {actionError}
                                </div>
                            )}

                            {actionSuccess && (
                                <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">
                                    {actionSuccess}
                                </div>
                            )}

                            {loadingRiders ? (
                                <div className="py-10 text-center">
                                    <p className="text-sm text-zinc-500">
                                        Loading available riders...
                                    </p>
                                </div>
                            ) : availableRiders.length ===
                            0 ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="font-medium text-amber-800">
                                        No riders available
                                    </p>

                                    <p className="mt-1 text-sm text-amber-700">
                                        There are currently no riders marked as available.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableRiders.map(
                                        (rider) => {
                                            const isCurrentRider =
                                                selectedOrder
                                                    ?.rider_id ===
                                                rider.id

                                            return (
                                                <button
                                                    key={
                                                        rider.id
                                                    }
                                                    type="button"
                                                    disabled={
                                                        actionLoading ||
                                                        isCurrentRider
                                                    }
                                                    onClick={() =>
                                                        handleRiderAssignment(
                                                            rider.id
                                                        )
                                                    }
                                                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                                                        isCurrentRider
                                                            ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60'
                                                            : 'border-zinc-200 hover:border-[#ed1c24]/30 hover:bg-[#fffaf7]'
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="font-medium text-zinc-900">
                                                            {rider
                                                                    .profile
                                                                    ?.name ||
                                                                'Unnamed rider'}
                                                        </p>

                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {rider
                                                                    .profile
                                                                    ?.phone ||
                                                                'No phone number'}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-green-500" />

                                                        <span className="text-xs font-medium capitalize text-green-700">
                                                            Available
                                                        </span>

                                                        {isCurrentRider && (
                                                            <span className="text-xs text-zinc-400">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        }
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[#eadfd4] bg-[#faf8f6] px-5 py-4">
                            <button
                                type="button"
                                onClick={
                                    closeRiderModal
                                }
                                disabled={
                                    actionLoading
                                }
                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}