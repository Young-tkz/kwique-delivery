import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'

function SendIcon({ className = 'h-6 w-6' }) {
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

export default async function CustomerPage() {
    const supabase = await createClient()

    const {
        data: { claims },
    } = await supabase.auth.getClaims()

    let profile = null

    if (claims?.sub) {
        const { data } = await supabase
            .from('profiles')
            .select('name, email, phone')
            .eq('id', claims.sub)
            .single()

        profile = data
    }

    const name = profile?.name || 'Customer'

    return (
        <div className="w-full">

            {/* Greeting */}
            <section className="mb-7">
                <p className="text-[17px] font-medium text-[#8a6259]">
                    Good afternoon,
                </p>

                <h1 className="mt-0.5 text-[38px] font-bold leading-[1.05] tracking-tight text-[#351d1a] sm:text-5xl">
                    {name}
                </h1>
            </section>

            {/* Main delivery CTA */}
            <section className="relative overflow-hidden rounded-[30px] bg-[#ed1c24] p-6 text-white shadow-[0_18px_40px_rgba(237,28,36,0.22)] sm:p-8 lg:p-10">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                    <SendIcon className="h-7 w-7" />
                </div>

                <div className="mt-9 max-w-xl">
                    <h2 className="text-[30px] font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
                        Where are we
                        <br />
                        delivering today?
                    </h2>

                    <p className="mt-3 text-[17px] leading-6 text-white/85 sm:text-lg">
                        Get a clear price before you place your order.
                    </p>
                </div>

                <Link
                    href="/customer/create"
                    className="mt-7 flex h-16 w-full items-center justify-center gap-3 rounded-full bg-white text-[17px] font-semibold text-[#ed1c24] transition hover:bg-[#fff5f5] sm:max-w-md"
                >
                    Create Delivery

                    <span className="text-xl">
                        →
                    </span>
                </Link>
            </section>

            {/* Recent deliveries */}
            <section className="mt-10">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[25px] font-bold tracking-tight text-[#351d1a]">
                        Recent deliveries
                    </h2>

                    <Link
                        href="/customer/history"
                        className="text-[16px] font-semibold text-[#ed1c24]"
                    >
                        View all
                    </Link>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_4px_20px_rgba(60,30,20,0.06)] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-[#8a6259]">
                                #1042
                            </p>

                            <h3 className="mt-2 text-xl font-bold text-[#351d1a]">
                                CBD → Sakubva
                            </h3>
                        </div>

                        <span className="rounded-full bg-[#fde2e2] px-4 py-2 text-sm font-semibold text-[#d71920]">
                            Delivered
                        </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                        <span className="text-sm text-[#8a6259]">
                            Delivery completed
                        </span>

                        <Link
                            href="/customer/history"
                            className="text-sm font-semibold text-[#351d1a]"
                        >
                            View
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    )
}