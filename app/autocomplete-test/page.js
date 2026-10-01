'use client'

import { useState } from 'react'

export default function AutocompleteTestPage() {
    const [text, setText] = useState('Chicken Inn')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function search() {
        setLoading(true)
        setError('')
        setResults([])

        try {
            const response = await fetch('/api/location/autocomplete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            })

            const data = await response.json()

            console.log('AUTOCOMPLETE RESPONSE:', data)

            if (!response.ok) {
                throw new Error(data.error || 'Search failed')
            }

            setResults(data.results || [])
        } catch (error) {
            console.error('Autocomplete test error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-zinc-100 p-6">
            <div className="mx-auto max-w-2xl text-slate-800">
                <h1 className="text-2xl font-bold">
                    KwiQue Autocomplete Test
                </h1>

                <p className="mt-2 text-sm text-zinc-500">
                    Testing Geoapify location search.
                </p>

                <div className="mt-6 flex gap-2">
                    <input
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Search for a place..."
                        className="flex-1 rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                    />

                    <button
                        onClick={search}
                        disabled={loading}
                        className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="mt-6 space-y-3">
                    {results.map((result, index) => (
                        <div
                            key={
                                result.placeId ||
                                `${result.lat}-${result.lng}-${index}`
                            }
                            className="rounded-xl border bg-white p-4"
                        >
                            <div className="font-semibold">
                                {result.name}
                            </div>

                            <div className="mt-1 text-sm text-zinc-500">
                                {result.formatted}
                            </div>

                            <div className="mt-2 text-xs text-zinc-400">
                                Coordinates: {result.lat}, {result.lng}
                            </div>

                            {result.resultType && (
                                <div className="mt-1 text-xs text-zinc-400">
                                    Type: {result.resultType}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {!loading && !error && results.length === 0 && (
                    <div className="mt-6 rounded-xl border bg-white p-6 text-center text-sm text-zinc-500">
                        No results yet.
                    </div>
                )}
            </div>
        </main>
    )
}