'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'


const navigation = [
    {
        label: 'Dashboard',
        href: '/admin',
    },
    {
        label: 'Live Operations',
        href: '/admin',
    },
    {
        label: 'Orders',
        href: '/admin/orders',
    },
    {
        label: 'Riders',
        href: '/admin/riders',
    },
    {
        label: 'Feedback',
        href: '/admin/feedback',
    },
]

export default function AdminNavigation() {
    const pathname = usePathname()

    return (
        <nav className="p-4">
            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Operations
            </div>

            <div className="space-y-1">
                {navigation.map((item) => {
                    const isActive =
                        item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname === item.href ||
                            pathname.startsWith(`${item.href}/`)

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                                isActive
                                    ? 'bg-zinc-100 text-zinc-900'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                        >
                            {item.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}