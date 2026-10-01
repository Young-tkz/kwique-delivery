'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function CustomerSettingsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState('')

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordSaving, setPasswordSaving] = useState(false)
    const [passwordStatus, setPasswordStatus] = useState('')

    async function loadProfile() {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('name, phone, email')
            .eq('id', user.id)
            .single()

        if (error) {
            console.error(error)

            setStatus(
                'Unable to load your account information.'
            )

            setLoading(false)
            return
        }

        setName(data?.name || '')
        setPhone(data?.phone || '')
        setEmail(data?.email || user.email || '')

        setLoading(false)
    }

    useEffect(() => {
        loadProfile()
    }, [])

    async function handleSave(event) {
        event.preventDefault()

        setSaving(true)
        setStatus('')

        const cleanPhone = phone.replace(/[^\d]/g, '')

        if (!name.trim()) {
            setStatus('Please enter your name.')
            setSaving(false)
            return
        }

        if (!/^07\d{8}$/.test(cleanPhone)) {
            setStatus(
                'Please enter a valid Zimbabwe mobile number, e.g. 0771234567.'
            )

            setSaving(false)
            return
        }

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                name: name.trim(),
                phone: cleanPhone,
            })
            .eq('id', user.id)

        if (error) {
            console.error(error)

            setStatus(
                'Unable to save your changes.'
            )

            setSaving(false)
            return
        }

        setPhone(cleanPhone)

        setStatus(
            'Changes saved successfully.'
        )

        setSaving(false)
    }

    async function handlePasswordChange(event) {
        event.preventDefault()

        setPasswordStatus('')

        if (newPassword.length < 6) {
            setPasswordStatus(
                'Password must be at least 6 characters long.'
            )

            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordStatus(
                'Passwords do not match.'
            )

            return
        }

        setPasswordSaving(true)

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (error) {
            console.error(error)

            setPasswordStatus(
                error.message ||
                'Unable to change your password.'
            )

            setPasswordSaving(false)
            return
        }

        setNewPassword('')
        setConfirmPassword('')

        setPasswordStatus(
            'Password changed successfully.'
        )

        setPasswordSaving(false)
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-2xl">
                <p className="text-sm text-[#8a6259]">
                    Loading your account...
                </p>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-2xl pb-8">

            {/* Header */}
            <section className="mb-8">

                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mb-5 text-sm font-medium text-[#8a6259] transition hover:text-[#351d1a]"
                >
                    ← Back
                </button>

                <p className="text-sm font-medium text-[#8a6259]">
                    Account
                </p>

                <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#351d1a]">
                    Settings
                </h1>

                <p className="mt-2 text-sm text-[#8a6259]">
                    Manage your KwiQue account information.
                </p>

            </section>

            {/* Personal information */}
            <section className="rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-8">

                <h2 className="text-lg font-bold text-[#351d1a]">
                    Personal information
                </h2>

                <p className="mt-1 text-sm text-[#8a6259]">
                    Keep your contact details up to date.
                </p>

                <form
                    onSubmit={handleSave}
                    className="mt-6 space-y-5"
                >

                    {/* Name */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#351d1a]">
                            Full name
                        </label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) =>
                                setName(e.target.value)
                            }
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm text-[#351d1a] outline-none transition focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#351d1a]">
                            Phone number
                        </label>

                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) =>
                                setPhone(e.target.value)
                            }
                            inputMode="numeric"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm text-[#351d1a] outline-none transition focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                            placeholder="0771234567"
                            required
                        />

                        <p className="mt-2 text-xs text-[#8a6259]">
                            Zimbabwe mobile number
                        </p>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#351d1a]">
                            Email address
                        </label>

                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full cursor-not-allowed rounded-2xl border border-black/5 bg-[#fff8f3] px-4 py-3.5 text-sm text-[#8a6259]"
                        />

                        <p className="mt-2 text-xs text-[#8a6259]">
                            Your email is used to sign in to KwiQue.
                        </p>
                    </div>

                    {/* Status */}
                    {status && (
                        <div
                            className={`rounded-2xl px-4 py-3 text-sm ${
                                status.includes('successfully')
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                            }`}
                        >
                            {status}
                        </div>
                    )}

                    {/* Save */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-2xl bg-[#ed1c24] px-5 py-4 font-semibold text-white shadow-[0_8px_20px_rgba(237,28,36,0.18)] transition hover:bg-[#d91820] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving
                            ? 'Saving changes...'
                            : 'Save changes'}
                    </button>

                </form>

            </section>

            {/* Security */}
            <section className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-8">

                <h2 className="text-lg font-bold text-[#351d1a]">
                    Security
                </h2>

                <p className="mt-1 text-sm text-[#8a6259]">
                    Keep your KwiQue account secure.
                </p>

                <form
                    onSubmit={handlePasswordChange}
                    className="mt-6 space-y-5"
                >

                    {/* New password */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#351d1a]">
                            New password
                        </label>

                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) =>
                                setNewPassword(e.target.value)
                            }
                            placeholder="Enter a new password"
                            minLength={6}
                            required
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm text-[#351d1a] outline-none transition focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                        />
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#351d1a]">
                            Confirm new password
                        </label>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            placeholder="Confirm your new password"
                            minLength={6}
                            required
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm text-[#351d1a] outline-none transition focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                        />
                    </div>

                    {/* Password status */}
                    {passwordStatus && (
                        <div
                            className={`rounded-2xl px-4 py-3 text-sm ${
                                passwordStatus.includes('successfully')
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                            }`}
                        >
                            {passwordStatus}
                        </div>
                    )}

                    {/* Change password */}
                    <button
                        type="submit"
                        disabled={passwordSaving}
                        className="w-full rounded-2xl border border-[#ed1c24] px-5 py-4 font-semibold text-[#ed1c24] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {passwordSaving
                            ? 'Changing password...'
                            : 'Change password'}
                    </button>

                </form>

            </section>

        </div>
    )
}