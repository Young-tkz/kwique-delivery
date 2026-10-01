import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.redirect(
            new URL('/?error=auth_callback', request.url)
        )
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('Auth callback error:', error)

        return NextResponse.redirect(
            new URL('/?error=auth_callback', request.url)
        )
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.redirect(
            new URL('/?error=auth_callback', request.url)
        )
    }

    /*
     * Determine where the authenticated user should go.
     *
     * Customers → /customer
     * Riders    → /rider
     * Admins    → /admin
     */

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('Profile lookup error:', profileError)

        return NextResponse.redirect(
            new URL('/?error=profile_lookup', request.url)
        )
    }

    if (profile.role === 'admin') {
        return NextResponse.redirect(
            new URL('/admin', request.url)
        )
    }

    if (profile.role === 'rider') {
        return NextResponse.redirect(
            new URL('/rider', request.url)
        )
    }

    return NextResponse.redirect(
        new URL('/customer', request.url)
    )
}