import { createClient } from '../../lib/supabase/server'

export default async function SessionTest() {
    const supabase = await createClient()

    const {
        data: { claims },
        error: claimsError,
    } = await supabase.auth.getClaims()

    if (claimsError) {
        return (
            <main className="p-10">
                <h1 className="text-2xl font-bold">Session Diagnostic</h1>
                <p className="mt-4 text-red-600">
                    Claims error: {claimsError.message}
                </p>
            </main>
        )
    }

    if (!claims) {
        return (
            <main className="p-10">
                <h1 className="text-2xl font-bold">Session Diagnostic</h1>
                <p className="mt-4">No authenticated session found.</p>
            </main>
        )
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', claims.sub)
        .single()

    return (
        <main className="min-h-screen p-10">
            <h1 className="text-2xl font-bold">Session Diagnostic</h1>

            <div className="mt-6 space-y-3">
                <p>
                    <strong>Claims user ID:</strong> {claims.sub}
                </p>

                <p>
                    <strong>Claims email:</strong> {claims.email}
                </p>

                <p>
                    <strong>Profile ID:</strong>{' '}
                    {profile?.id || 'No profile'}
                </p>

                <p>
                    <strong>Profile email:</strong>{' '}
                    {profile?.email || 'No profile'}
                </p>

                <p>
                    <strong>Profile role:</strong>{' '}
                    {profile?.role || 'No role'}
                </p>

                <p>
                    <strong>Profile error:</strong>{' '}
                    {profileError?.message || 'None'}
                </p>
            </div>
        </main>
    )
}