'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function RiderInvitePage() {
    const router = useRouter()
    const params = useParams()

    const token = params.token

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleActivate(e) {
        e.preventDefault()

        if (password !== confirmPassword) {
            setStatus('❌ Passwords do not match.')
            return
        }

        if (password.length < 6) {
            setStatus('❌ Password must be at least 6 characters.')
            return
        }

        setLoading(true)
        setStatus('Activating your rider account...')

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

            if (!response.ok) {
                setStatus(
                    `❌ ${result.error || 'Could not activate account.'}`
                )
                setLoading(false)
                return
            }

            setStatus('✅ Account activated! Redirecting...')

            /*
             * The account has been created, but the activation API
             * does not establish a browser session.
             *
             * Send the rider to login with their new credentials.
             */
            setTimeout(() => {
                router.push('/login')
            }, 1200)
        } catch (error) {
            console.error(error)

            setStatus(
                '❌ Something went wrong. Please try again.'
            )

            setLoading(false)
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
            <form
                onSubmit={handleActivate}
                className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"
            >
                <div className="mb-8">
                    <div className="mb-3 text-sm font-medium text-slate-500">
                        KwiQue Delivery
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800">
                        Activate your rider account
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Create a password to activate your KwiQue rider
                        account.
                    </p>
                </div>

                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Password
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 text-slate-700 outline-none focus:border-black"
                        placeholder="Create a password"
                        minLength={6}
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Confirm password
                    </label>

                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) =>
                            setConfirmPassword(e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 text-slate-700 outline-none focus:border-black"
                        placeholder="Confirm your password"
                        minLength={6}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-black px-4 py-2.5 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading
                        ? 'Activating...'
                        : 'Activate account'}
                </button>

                {status && (
                    <p className="mt-5 text-sm text-slate-700">
                        {status}
                    </p>
                )}
            </form>
        </main>
    )
}