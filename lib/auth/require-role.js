import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

export async function requireRole(role) {
    const supabase = await createClient()

    const {
        data,
        error: claimsError,
    } = await supabase.auth.getClaims()

    const claims = data?.claims

    // No authenticated session
    if (claimsError || !claims?.sub) {
        redirect('/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', claims.sub)
        .single()

    // Authenticated account exists, but no profile exists
    if (profileError || !profile) {
        redirect('/signup')
    }

    // User is authenticated and has a profile,
    // but doesn't have the required role
    if (profile.role !== role) {
        redirect('/unauthorized')
    }

    return {
        user: claims,
        profile,
    }
}