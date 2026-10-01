'use client'

import { useState } from 'react'

export default function LocationTestPage() {
    const [pickupAddress, setPickupAddress] = useState(
        'Chicken Inn Sakunda, Corner of Aerodrome Road and A3, Mutare, Zimbabwe'
    )

    const [destinationAddress, setDestinationAddress] = useState(
        'Holiday Inn, Corner Aerodrome Road and Third Street, Mutare, Zimbabwe'
    )

    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function testRoute() {
        setLoading(true)
        setError('')
        setResult(null)

        try {
            const response = await fetch('/api/location/route', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pickupAddress,
                    destinationAddress,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Routing failed')
            }

            setResult(data)
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-zinc-50 p-8">
            <div className="mx-auto max-w-3xl text-slate-800">
                <h1 className="text-2xl font-bold">
                    KwiQue Route Test
                </h1>

                <p className="mt-2 text-zinc-500">
                    Testing Geoapify motorcycle routing in Mutare.
                </p>

                <div className="mt-8 space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Pickup
                        </label>

                        <input
                            value={pickupAddress}
                            onChange={(event) =>
                                setPickupAddress(event.target.value)
                            }
                            className="w-full rounded-xl border bg-white px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Destination
                        </label>

                        <input
                            value={destinationAddress}
                            onChange={(event) =>
                                setDestinationAddress(event.target.value)
                            }
                            className="w-full rounded-xl border bg-white px-4 py-3"
                        />
                    </div>

                    <button
                        onClick={testRoute}
                        disabled={loading}
                        className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
                    >
                        {loading ? 'Calculating route...' : 'Test route'}
                    </button>
                </div>

                {error && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="mt-6 rounded-xl border bg-white p-6">
                        <h2 className="text-lg font-semibold">
                            Routing successful
                        </h2>

                        <div className="mt-5 space-y-4 text-sm">
                            <div>
                                <p className="font-semibold">Pickup</p>
                                <p className="text-zinc-600">
                                    {result.pickup.formatted}
                                </p>
                                <p>
                                    {result.pickup.lat},{' '}
                                    {result.pickup.lng}
                                </p>
                            </div>

                            <div>
                                <p className="font-semibold">Destination</p>
                                <p className="text-zinc-600">
                                    {result.destination.formatted}
                                </p>
                                <p>
                                    {result.destination.lat},{' '}
                                    {result.destination.lng}
                                </p>
                            </div>

                            <div className="rounded-xl bg-zinc-100 p-4">
                                <p className="font-semibold">
                                    Motorcycle route
                                </p>

                                <p className="mt-2 text-2xl font-bold">
                                    {result.route.distanceKm.toFixed(2)} km
                                </p>

                                <p className="text-zinc-500">
                                    Estimated time:{' '}
                                    {Math.round(
                                        result.route.timeSeconds / 60
                                    )}{' '}
                                    minutes
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}