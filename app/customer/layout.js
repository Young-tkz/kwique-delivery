import Link from 'next/link'
import { requireRole } from '../../lib/auth/require-role'
import LogoutButton from '../../components/shared/LogoutButton'

function HomeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10.5 12 3l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 18.5v-8Z"
            />
        </svg>
    )
}

function OrdersIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
        >
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path
                strokeLinecap="round"
                d="M9 7h6M9 11h6M9 15h4"
            />
        </svg>
    )
}

function ProfileIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
        >
            <circle cx="12" cy="8" r="3.5" />
            <path
                strokeLinecap="round"
                d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5"
            />
        </svg>
    )
}

function SendIcon({ className = 'h-5 w-5' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m10.3 13.7 5.2-5.2"
            />
        </svg>
    )
}

export default async function CustomerLayout({ children }) {
    await requireRole('customer')

    return (
        <div className="min-h-screen bg-[#fff8f3] text-[#351d1a]">
            {/* Header */}
            <header className="w-full">
                <div className="mx-auto flex h-[76px] w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Brand */}
                    <Link
                        href="/customer"
                        className="flex items-center gap-3"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-xl font-bold text-white">
                            K
                        </div>

                        <div className="leading-none">
                            <div className="text-[20px] font-bold tracking-tight">
                                KwiQue
                            </div>

                            <div className="mt-1 text-[13px] text-[#8a6259]">
                                Delivery · Mutare
                            </div>
                        </div>
                    </Link>

                    {/* Header actions */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/customer/orders"
                            className="flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2.5 text-sm font-medium text-[#351d1a] shadow-sm transition hover:shadow-md"
                        >
                            <SendIcon className="h-4 w-4" />
                            <span>Track</span>
                        </Link>

                        {/* Keep working logout available on larger screens */}
                        <div className="hidden lg:block">
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </header>

            {/* Page */}
            <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-7 lg:px-8">
                {children}
            </main>

            {/* Mobile bottom navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
                <div className="border-t border-black/5 bg-[#fffaf7] px-4 pt-2 shadow-[0_-6px_24px_rgba(60,30,20,0.08)]">
                    <div
                        className="mx-auto flex w-full max-w-md items-end justify-between"
                        style={{
                            paddingBottom:
                                'max(10px, env(safe-area-inset-bottom))',
                        }}
                    >
                        {/* Home */}
                        <Link
                            href="/customer"
                            className="flex w-16 flex-col items-center gap-1 py-1 text-[#ed1c24]"
                        >
                            <HomeIcon />

                            <span className="text-[11px] font-semibold">
                                Home
                            </span>
                        </Link>

                        {/* Orders */}
                        <Link
                            href="/customer/orders"
                            className="flex w-16 flex-col items-center gap-1 py-1 text-[#8a6259] transition hover:text-[#351d1a]"
                        >
                            <OrdersIcon />

                            <span className="text-[11px] font-medium">
                                Orders
                            </span>
                        </Link>

                        {/* Create delivery */}
                        <Link
                            href="/customer/create"
                            aria-label="Create delivery"
                            className="-mt-7 flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-[#ed1c24] text-white shadow-[0_8px_24px_rgba(237,28,36,0.3)] transition hover:bg-[#d91820]"
                        >
                            <SendIcon className="h-7 w-7" />
                        </Link>

                        {/* Profile */}
                        <Link
                            href="/customer/profile"
                            className="flex w-16 flex-col items-center gap-1 py-1 text-[#8a6259] transition hover:text-[#351d1a]"
                        >
                            <ProfileIcon />

                            <span className="text-[11px] font-medium">
                                Profile
                            </span>
                        </Link>
                    </div>
                </div>
            </nav>
        </div>
    )
}