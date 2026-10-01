import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

export default async function ProtectedTest() {
    const supabase = await createClient()

    const {
        data: { claims },
    } = await supabase.auth.getClaims()

    if (!claims) {
        redirect('/auth-test')
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', claims.sub)
        .single()

    if (error || !profile) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p>Authenticated, but profile could not be loaded.</p>
            </main>
        )
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50">
            <div className="rounded-2xl border bg-white p-8 shadow-sm text-slate-800">
                <h1 className="mb-4 text-2xl font-bold">
                    Protected KwiQue Page
                </h1>

                <p className="mb-2">
                    <strong>Name:</strong> {profile.name || 'Not set'}
                </p>

                <p className="mb-2">
                    <strong>Email:</strong> {profile.email}
                </p>

                <p>
                    <strong>Role:</strong> {profile.role}
                </p>
            </div>
        </main>
    )
}