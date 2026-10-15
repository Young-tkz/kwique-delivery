
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function RiderInvitePage() {
    const params = useParams()
    const router = useRouter()
    const token = params?.token

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')

        if (!token) {
            setError('This invitation link is invalid.')
            return
        }

        if (password.length < 8) {
            setError('Your password must be at least 8 characters.')
            return
        }

        if (password !== confirmPassword) {
            setError('Your passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(
                '/api/rider/invite/activate',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token,
                        password,
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok || !result.success) {
                setError(
                    result.error ||
                    'We could not activate your account. Please request a new invitation.'
                )
                return
            }

            setSuccess(true)

            setTimeout(() => {
                router.replace('/login')
            }, 2000)
        } catch (err) {
            console.error('Rider activation error:', err)
            setError(
                'Something went wrong. Please check your connection and try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black">
                        K
                    </div>

                    <h1 className="text-2xl font-bold">
                        Join KwiQue Delivery
                    </h1>

                    <p className="mt-2 text-sm text-slate-400">
                        Set up your password to activate your rider account.
                    </p>
                </div>

                {success ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                        <p className="font-semibold text-emerald-400">
                            Account activated successfully!
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                            Redirecting you to login...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-slate-200"
                            >
                                Create password
                            </label>

                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                minLength={8}
                                required
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="At least 8 characters"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-2 block text-sm font-medium text-slate-200"
                            >
                                Confirm password
                            </label>

                            <input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                minLength={8}
                                required
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                placeholder="Enter your password again"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? 'Activating account...'
                                : 'Activate rider account'}
                        </button>

                        <p className="text-center text-xs text-slate-500">
                            Only use an invitation sent to you by KwiQue Delivery.
                        </p>
                    </form>
                )}
            </div>
        </main>
    )
}

