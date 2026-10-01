import Link from 'next/link'
import { requireRole } from '../../lib/auth/require-role'
import { createClient } from '../../lib/supabase/server'

export default async function RiderLayout({ children }) {
    await requireRole('rider')

    const supabase = await createClient()

    const {
        data: { claims },
    } = await supabase.auth.getClaims()

    let riderName = 'Rider'

    if (claims?.sub) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', claims.sub)
            .single()

        if (profile?.name) {
            riderName = profile.name
        }
    }

    const initials = riderName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()

    return (
        <div className="min-h-screen bg-[#fff8ef] text-[#0f1720]">

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#fff8ef]">
                <div className="mx-auto flex h-[72px] w-full max-w-5xl items-center justify-between px-4 sm:px-6">

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b18] to-[#ed1c24] text-xl font-black text-white shadow-sm">
                            K
                        </div>

                        <span className="text-[22px] font-black tracking-tight">
                            KwiQue Rider
                        </span>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffdcae] text-sm font-black">
                        {initials || 'R'}
                    </div>
                </div>
            </header>

            {/* Page content */}
            <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6">
                {children}
            </main>

            {/* Bottom navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white">
                <div className="mx-auto flex h-[76px] w-full max-w-5xl items-center justify-around px-6">

                    <Link
                        href="/rider"
                        className="flex min-w-[90px] flex-col items-center justify-center gap-1 text-[#687080] transition hover:text-[#111827]"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-5 w-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z"
                            />
                        </svg>

                        <span className="text-sm font-bold">
                            Home
                        </span>
                    </Link>

                    <Link
                        href="/rider/history"
                        className="flex min-w-[90px] flex-col items-center justify-center gap-1 text-[#687080] transition hover:text-[#111827]"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="8"
                            />

                            <path
                                strokeLinecap="round"
                                d="M12 8v4l2.5 2"
                            />
                        </svg>

                        <span className="text-sm font-bold">
                            History
                        </span>
                    </Link>

                </div>
            </nav>

        </div>
    )
}