'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomerFeedback({ orderId }) {
    const [rating, setRating] = useState(0)
    const [orderingEasy, setOrderingEasy] = useState(null)
    const [trackingUseful, setTrackingUseful] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const router = useRouter()

    async function submitFeedback() {
        setError('')

        if (rating < 1 || rating > 5) {
            setError('Please select a rating.')
            return
        }

        if (
            typeof orderingEasy !== 'boolean' ||
            typeof trackingUseful !== 'boolean'
        ) {
            setError('Please answer both questions.')
            return
        }

        try {
            setSubmitting(true)

            const response = await fetch(
                '/api/customer/feedback',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId,
                        rating,
                        orderingEasy,
                        trackingUseful,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Unable to submit feedback.'
                )
            }

            setSubmitted(true)

            setTimeout(() => {
                router.push('/customer')
            }, 1800)
        } catch (err) {
            console.error(
                'Feedback submission error:',
                err
            )

            setError(
                err.message ||
                'Unable to submit feedback.'
            )
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="px-6 py-10 text-center sm:px-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white">
                            ✓
                        </div>
                    </div>

                    <h2 className="mt-6 text-xl font-bold tracking-tight text-zinc-950">
                        Thanks for your feedback!
                    </h2>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                        Your feedback helps us make KwiQue
                        better for everyone.
                    </p>

                    <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Taking you back to KwiQue
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            {/* Header */}
            <div className="border-b border-zinc-100 px-6 py-6 sm:px-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-lg">
                    💬
                </div>

                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                    How was your experience?
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                    Tell us how your delivery went.
                </p>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
                {/* Rating */}
                <div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-zinc-900">
                                Rate your experience
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                                Tap a star to rate your delivery.
                            </p>
                        </div>

                        {rating > 0 && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                                {rating}/5
                            </span>
                        )}
                    </div>

                    <div className="mt-4 flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                aria-label={`${star} star${
                                    star > 1 ? 's' : ''
                                }`}
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl transition active:scale-95 ${
                                    star <= rating
                                        ? 'border-red-200 bg-red-50 text-red-500'
                                        : 'border-zinc-200 bg-zinc-50 text-zinc-300 hover:border-zinc-300 hover:bg-white'
                                }`}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="my-7 h-px bg-zinc-100" />

                {/* Ordering */}
                <FeedbackQuestion
                    title="Was ordering easy?"
                    value={orderingEasy}
                    onChange={setOrderingEasy}
                />

                <div className="my-7 h-px bg-zinc-100" />

                {/* Tracking */}
                <FeedbackQuestion
                    title="Was live tracking useful?"
                    value={trackingUseful}
                    onChange={setTrackingUseful}
                />

                {/* Error */}
                {error && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-medium text-red-700">
                            {error}
                        </p>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="button"
                    onClick={submitFeedback}
                    disabled={submitting}
                    className="mt-7 w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Submitting...
                        </span>
                    ) : (
                        'Submit feedback'
                    )}
                </button>

                <p className="mt-3 text-center text-xs text-zinc-400">
                    Your feedback helps us improve KwiQue.
                </p>
            </div>
        </section>
    )
}

function FeedbackQuestion({
                              title,
                              value,
                              onChange,
                          }) {
    return (
        <div>
            <p className="text-sm font-semibold text-zinc-900">
                {title}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
                <ChoiceButton
                    selected={value === true}
                    onClick={() => onChange(true)}
                >
                    <span className="text-base">✓</span>
                    Yes
                </ChoiceButton>

                <ChoiceButton
                    selected={value === false}
                    onClick={() => onChange(false)}
                >
                    <span className="text-base">×</span>
                    No
                </ChoiceButton>
            </div>
        </div>
    )
}

function ChoiceButton({
                          selected,
                          onClick,
                          children,
                      }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                selected
                    ? 'border-red-600 bg-red-600 text-white shadow-sm'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
            }`}
        >
            {children}
        </button>
    )
}