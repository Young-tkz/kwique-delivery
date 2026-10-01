'use client'

import { useEffect, useRef, useState } from 'react'
import LocationMapPicker from './LocationMapPicker'

export default function LocationPicker({
                                           label,
                                           value,
                                           onChange,
                                       }) {
    const [query, setQuery] = useState(
        value?.formatted || ''
    )

    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [error, setError] = useState('')

    const searchTimeout = useRef(null)

    useEffect(() => {
        if (value?.formatted && !value?.needsPin) {
            setQuery(value.formatted)
        }
    }, [value])

    function handleChange(event) {
        const text = event.target.value

        setQuery(text)
        setError('')
        setShowResults(true)

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current)
        }

        if (text.trim().length < 2) {
            setResults([])
            return
        }

        searchTimeout.current = setTimeout(() => {
            searchLocations(text)
        }, 350)
    }

    async function searchLocations(text) {
        setLoading(true)
        setError('')

        try {
            const response = await fetch(
                '/api/location/autocomplete',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error || 'Location search failed'
                )
            }

            setResults(data.results || [])
        } catch (error) {
            console.error(error)

            setError('Unable to search locations.')
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    function selectLocation(location) {
        const selectedLocation = {
            name: location.name,
            formatted: location.formatted,
            lat: location.lat,
            lng: location.lng,
            placeId: location.placeId,
            resultType: location.resultType,
            needsPin: false,
        }

        setQuery(location.formatted)
        setResults([])
        setShowResults(false)

        onChange(selectedLocation)
    }

    function openPinPicker() {
        setResults([])
        setShowResults(false)

        onChange({
            ...(value || {}),
            needsPin: true,
        })
    }

    function cancelPinPicker() {
        onChange({
            ...(value || {}),
            needsPin: false,
        })
    }

    function confirmPinnedLocation(location) {
        setQuery(location.formatted)
        setResults([])
        setShowResults(false)

        onChange(location)
    }

    return (
        <div className="relative">
            {/* Label */}
            <label className="mb-2 block text-sm font-bold text-[#351b18]">
                {label}
            </label>

            {!value?.needsPin && (
                <>
                    {/* Search input */}
                    <div className="relative">
                        <input
                            value={query}
                            onChange={handleChange}
                            onFocus={() => {
                                if (results.length > 0) {
                                    setShowResults(true)
                                }
                            }}
                            placeholder="Search for a place or address"
                            className="w-full rounded-full border border-[#efd5cf] bg-white px-5 py-4 pr-12 text-[16px] text-[#351b18] outline-none transition placeholder:text-[#aa8b84] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                        />

                        {/* Search / loading icon */}
                        <div className="absolute right-5 top-1/2 -translate-y-1/2">
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#f1d5d0] border-t-[#ed1c24]" />
                            ) : (
                                <span className="text-lg text-[#8b6259]">
                                    ⌕
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Selected location */}
                    {value?.lat &&
                        value?.lng &&
                        !value?.needsPin && (
                            <div className="mt-2 flex items-center gap-2 px-3 text-xs font-medium text-[#7d9b76]">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e7f3e4] text-[10px]">
                                    ✓
                                </span>

                                Location selected
                            </div>
                        )}

                    {/* Search results */}
                    {showResults &&
                        results.length > 0 && (
                            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-[22px] border border-[#eadedb] bg-white shadow-[0_15px_40px_rgba(70,30,20,0.12)]">

                                <div className="px-5 pb-2 pt-4">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#aa8b84]">
                                        Locations
                                    </p>
                                </div>

                                {results.map(
                                    (location, index) => (
                                        <button
                                            key={
                                                location.placeId ||
                                                `${location.lat}-${location.lng}-${index}`
                                            }
                                            type="button"
                                            onClick={() =>
                                                selectLocation(
                                                    location
                                                )
                                            }
                                            className="flex w-full items-start gap-3 border-b border-[#f4e8e4] px-5 py-4 text-left transition hover:bg-[#fff8f6] active:bg-[#fff1ee]"
                                        >
                                            {/* Location icon */}
                                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0ed] text-[#ed1c24]">
                                                <span className="text-base">
                                                    ●
                                                </span>
                                            </div>

                                            {/* Location text */}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-bold text-[#351b18]">
                                                    {
                                                        location.name
                                                    }
                                                </div>

                                                <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#8b6259]">
                                                    {
                                                        location.formatted
                                                    }
                                                </div>
                                            </div>

                                            <span className="mt-2 text-sm text-[#c7aaa3]">
                                                →
                                            </span>
                                        </button>
                                    )
                                )}

                                {/* Pin option */}
                                <button
                                    type="button"
                                    onClick={openPinPicker}
                                    className="flex w-full items-center gap-3 bg-[#fffaf8] px-5 py-4 text-left transition hover:bg-[#fff2ef]"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-white">
                                        <span className="text-sm">
                                            +
                                        </span>
                                    </div>

                                    <div>
                                        <div className="text-sm font-bold text-[#351b18]">
                                            Drop a pin on the map
                                        </div>

                                        <div className="mt-0.5 text-xs text-[#8b6259]">
                                            Choose the exact location
                                            manually
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}

                    {/* No results */}
                    {showResults &&
                        results.length === 0 &&
                        query.trim().length >= 2 &&
                        !loading && (
                            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-[22px] border border-[#eadedb] bg-white shadow-[0_15px_40px_rgba(70,30,20,0.12)]">
                                <div className="px-5 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0ed] text-[#ed1c24]">
                                            ?
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-[#351b18]">
                                                No exact location found
                                            </p>

                                            <p className="mt-0.5 text-xs text-[#8b6259]">
                                                Try another search or
                                                choose the location
                                                manually.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={openPinPicker}
                                    className="flex w-full items-center gap-3 border-t border-[#f4e8e4] bg-[#fffaf8] px-5 py-4 text-left transition hover:bg-[#fff2ef]"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-white">
                                        <span className="text-sm">
                                            +
                                        </span>
                                    </div>

                                    <div>
                                        <div className="text-sm font-bold text-[#351b18]">
                                            Drop a pin on the map
                                        </div>

                                        <div className="mt-0.5 text-xs text-[#8b6259]">
                                            Choose the exact location
                                            manually
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}

                    {/* Error */}
                    {error && (
                        <div className="mt-2 flex items-center gap-2 px-3 text-xs font-medium text-[#d71920]">
                            <span>!</span>
                            {error}
                        </div>
                    )}
                </>
            )}

            {/* Map pin picker */}
            {value?.needsPin && (
                <div className="mt-1 overflow-hidden rounded-[24px]">
                    <LocationMapPicker
                        initialLocation={value}
                        onConfirm={confirmPinnedLocation}
                        onCancel={cancelPinPicker}
                    />
                </div>
            )}
        </div>
    )
}