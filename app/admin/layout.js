import Link from 'next/link'
import { requireRole } from '../../lib/auth/require-role'
import LogoutButton from '../../components/shared/LogoutButton'
import AdminNavigation from '../../components/admin/AdminNavigation'

const navigation = [
    {
        label: 'Dashboard',
        href: '/admin',
        icon: '▦',
    },
    {
        label: 'Live Operations',
        href: '/admin',
        icon: '⌁',
    },
    {
        label: 'Orders',
        href: '/admin/orders',
        icon: '▤',
    },
    {
        label: 'Riders',
        href: '/admin/riders',
        icon: '♟',
    },
    {
        label: 'Feedback',
        href: '/admin/feedback',
        icon: '★',
    },
]

export default async function AdminLayout({ children }) {
    await requireRole('admin')

    return (
        <div className="min-h-screen bg-[#faf7f2] text-[#101828]">
            <div className="flex min-h-screen">

                {/* SIDEBAR */}
                <aside className="hidden w-[276px] shrink-0 border-r border-[#e8e0d7] bg-white lg:flex lg:flex-col">

                    {/* Logo */}
                    <div className="flex h-[96px] items-center px-7">
                        <Link
                            href="/admin"
                            className="flex items-center gap-3"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a00] to-[#ffc400] text-2xl font-black text-[#111827]">
                                K
                            </div>

                            <span className="text-[21px] font-extrabold tracking-[-0.02em]">
                                KwiQue
                            </span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <AdminNavigation className="flex-1 px-5 py-4">
                        <div className="space-y-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group flex items-center gap-4 rounded-xl px-3 py-3 text-[16px] font-semibold text-[#344054] transition-colors hover:bg-[#faf7f2] hover:text-[#101828]"
                                >
                                    <span className="flex w-5 items-center justify-center text-[17px] text-[#475467] transition-colors group-hover:text-[#101828]">
                                        {item.icon}
                                    </span>

                                    <span>
                                        {item.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </AdminNavigation>

                    {/* Owner / Logout */}
                    <div className="border-t border-[#eee6de] px-7 py-6">
                        <div className="mb-4">
                            <p className="text-[16px] font-bold text-[#101828]">
                                Owner
                            </p>

                            <p className="mt-1 text-[14px] text-[#667085]">
                                Mutare operations
                            </p>
                        </div>

                        <LogoutButton />
                    </div>
                </aside>

                {/* MAIN AREA */}
                <div className="flex min-w-0 flex-1 flex-col">

                    {/* Top status bar */}
                    <header className="flex h-[76px] shrink-0 items-center justify-end border-b border-[#eee6de] bg-[#faf7f2] px-6 sm:px-8 lg:px-10">
                        <div className="flex items-center gap-2 rounded-full bg-[#eaf8ef] px-4 py-2 text-[13px] font-bold text-[#079447]">
                            <span className="h-2 w-2 rounded-full bg-[#12b76a]" />
                            OPERATING NORMALLY
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-9 lg:py-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}