'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function AuthTest() {
    const [email, setEmail] = useState('customer.test@gmail.com')
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState('')

    async function handleLogin(e) {
        e.preventDefault()

        setStatus('Logging in...')

        const supabase = createClient()

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error(error)
            setStatus(`❌ Login failed: ${error.message}`)
            return
        }

        const user = data.user

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error(profileError)
            setStatus(`⚠️ Login worked, but profile lookup failed: ${profileError.message}`)
            return
        }

        console.log('Authenticated user:', user)
        console.log('Profile:', profile)

        setStatus(
            `✅ Login successful! Role: ${profile.role}`
        )
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-md rounded-2xl  border bg-white p-8 shadow-sm"
            >
                <h1 className="mb-6 text-2xl text-slate-800 font-bold">
                    KwiQue Auth Test
                </h1>

                <div className="mb-4">
                    <label className="mb-2 block text-slate-800 text-sm font-medium">
                        Email
                    </label>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg text-slate-500 border px-3 py-2"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="mb-2 block text-sm text-slate-800 font-medium">
                        Password
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg text-slate-500 border px-3 py-2"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white"
                >
                    Test Login
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