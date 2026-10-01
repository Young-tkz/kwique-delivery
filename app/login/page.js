'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LoginPage() {
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()

        setLoading(true)
        setStatus('Logging in...')

        const supabase = createClient()

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error(error)
            setStatus(`❌ Login failed: ${error.message}`)
            setLoading(false)
            return
        }

        const user = data.user

        if (!user) {
            setStatus(
                '❌ Login failed: No authenticated user found.'
            )
            setLoading(false)
            return
        }

        // Email verification is required before accessing KwiQue.
        if (!user.email_confirmed_at) {
            await supabase.auth.signOut()

            setStatus(
                '📧 Please verify your email address before logging in. Check your inbox for the verification email.'
            )

            setLoading(false)
            return
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error(profileError)

            setStatus(
                '⚠️ Login worked, but your KwiQue profile could not be loaded.'
            )

            setLoading(false)
            return
        }

        console.log('Authenticated user:', user)
        console.log('Profile:', profile)

        if (profile.role === 'customer') {
            router.push('/customer')
            return
        }

        if (profile.role === 'rider') {
            router.push('/rider')
            return
        }

        if (profile.role === 'admin') {
            router.push('/admin')
            return
        }

        setStatus(
            '❌ Your account does not have a valid KwiQue role.'
        )

        setLoading(false)
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"
            >
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">
                        Welcome to KwiQue
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Sign in to continue to your account.
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
                        placeholder="Enter your password"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-black px-4 py-2.5 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? 'Logging in...' : 'Log in'}
                </button>

                {status && (
                    <p className="mt-5 text-sm text-slate-700">
                        {status}
                    </p>
                )}

                <p className="mt-6 text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={() => router.push('/signup')}
                        className="font-medium text-slate-900 hover:underline"
                    >
                        Sign up
                    </button>
                </p>
            </form>
        </main>
    )
}