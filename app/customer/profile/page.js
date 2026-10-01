import { createClient } from '../../../lib/supabase/server'
import LogoutButton from '../../../components/shared/LogoutButton'
import Link from 'next/link'

export default async function CustomerProfilePage() {
    const supabase = await createClient()

    const {
        data: { claims },
    } = await supabase.auth.getClaims()

    let profile = null

    if (claims?.sub) {
        const { data } = await supabase
            .from('profiles')
            .select('name, email, phone, role')
            .eq('id', claims.sub)
            .single()

        profile = data
    }

    const name = profile?.name || 'Customer'
    const email = profile?.email || claims?.email || ''
    const phone = profile?.phone || ''

    const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()

    return (
        <div className="mx-auto w-full max-w-2xl pb-8">

            {/* Page heading */}
            <section className="mb-8">
                <p className="text-sm font-medium text-[#8a6259]">
                    Account
                </p>

                <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#351d1a]">
                    Profile
                </h1>
            </section>

            {/* Profile */}
            <section className="rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-8">
                <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-2xl font-bold text-white">
                        {initials}
                    </div>

                    <div className="min-w-0">
                        <h2 className="truncate text-2xl font-bold text-[#351d1a]">
                            {name}
                        </h2>

                        {email && (
                            <p className="mt-1 truncate text-sm text-[#8a6259]">
                                {email}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Account details */}
            <section className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-8">
                <h2 className="text-lg font-bold text-[#351d1a]">
                    Account details
                </h2>

                <div className="mt-5 divide-y divide-black/5">

                    {/* Name */}
                    <div className="flex items-center justify-between gap-4 py-4">
                        <span className="text-sm text-[#8a6259]">
                            Name
                        </span>

                        <span className="max-w-[60%] truncate text-right text-sm font-semibold text-[#351d1a]">
                            {name}
                        </span>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between gap-4 py-4">
                        <span className="text-sm text-[#8a6259]">
                            Phone
                        </span>

                        <span className="max-w-[60%] truncate text-right text-sm font-semibold text-[#351d1a]">
                            {phone || 'Not available'}
                        </span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between gap-4 py-4">
                        <span className="text-sm text-[#8a6259]">
                            Email
                        </span>

                        <span className="max-w-[60%] truncate text-right text-sm font-semibold text-[#351d1a]">
                            {email || 'Not available'}
                        </span>
                    </div>

                </div>
            </section>

            {/* Settings */}
            <section className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-8">
                <h2 className="text-lg font-bold text-[#351d1a]">
                    Settings
                </h2>

                <div className="mt-4">
                    <Link
                        href="/customer/settings"
                        className="flex w-full items-center justify-between rounded-2xl border border-black/5 px-4 py-4 text-left transition hover:bg-[#fff8f3]"
                    >
                        <div>
                            <p className="font-semibold text-[#351d1a]">
                                Account settings
                            </p>

                            <p className="mt-1 text-sm text-[#8a6259]">
                                Manage your account information
                            </p>
                        </div>

                        <span className="text-xl text-[#8a6259]">
                            →
                        </span>
                    </Link>
                </div>
            </section>

            {/* Logout */}
            <section className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(60,30,20,0.06)] sm:p-8">
                <h2 className="text-lg font-bold text-[#351d1a]">
                    Account
                </h2>

                <p className="mt-1 text-sm text-[#8a6259]">
                    Sign out of your KwiQue account on this device.
                </p>

                <div className="mt-5">
                    <LogoutButton />
                </div>
            </section>

        </div>
    )
}