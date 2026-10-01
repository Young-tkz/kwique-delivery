'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function SignupPage() {
    const router = useRouter()

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    function formatZimbabwePhone(value) {
        return value.replace(/[^\d]/g, '')
    }

    async function handleSignup(e) {
        e.preventDefault()

        setLoading(true)
        setStatus('Creating your account...')

        const cleanPhone = formatZimbabwePhone(phone)

        // Zimbabwe local format: 0771234567
        if (!/^07\d{8}$/.test(cleanPhone)) {
            setStatus(
                '❌ Please enter a valid Zimbabwe mobile number, e.g. 0771234567.'
            )
            setLoading(false)
            return
        }

        const supabase = createClient()

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name.trim(),
                    phone: cleanPhone,
                },
            },
        })

        if (error) {
            console.error(error)
            setStatus(`❌ Signup failed: ${error.message}`)
            setLoading(false)
            return
        }

        if (!data.user) {
            setStatus(
                '❌ Account creation failed. Please try again.'
            )
            setLoading(false)
            return
        }

        /*
         * The database trigger automatically creates:
         *
         * profiles.id
         * profiles.name
         * profiles.phone
         * profiles.email
         * profiles.role = customer
         *
         * Email confirmation is required before login.
         */

        setStatus(
            '✅ Account created! Please check your email and verify your account before logging in.'
        )

        setTimeout(() => {
            router.push('/login?verified=pending')
        }, 1200)
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
            <form
                onSubmit={handleSignup}
                className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"
            >
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">
                        Create your KwiQue account
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Create an account to start sending deliveries.
                    </p>
                </div>

                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Full name
                    </label>

                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-slate-700 outline-none focus:border-black"
                        placeholder="Your full name"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Phone number
                    </label>

                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-slate-700 outline-none focus:border-black"
                        placeholder="0771234567"
                        inputMode="numeric"
                        required
                    />

                    <p className="mt-1 text-xs text-slate-500">
                        Zimbabwe mobile number
                    </p>
                </div>

                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Email
                    </label>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-slate-700 outline-none focus:border-black"
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Password
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-slate-700 outline-none focus:border-black"
                        placeholder="Create a password"
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
                        ? 'Creating account...'
                        : 'Create account'}
                </button>

                {status && (
                    <p className="mt-5 text-sm text-slate-700">
                        {status}
                    </p>
                )}

                <p className="mt-6 text-center text-sm text-slate-500">
                    Already have an account?{' '}

                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="font-medium text-slate-900 hover:underline"
                    >
                        Log in
                    </button>
                </p>
            </form>
        </main>
    )
}