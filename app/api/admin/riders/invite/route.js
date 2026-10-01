import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'

function normalizeZimbabwePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '')

    if (!/^07\d{8}$/.test(digits)) {
        return null
    }

    return `+263${digits.slice(1)}`
}

export async function POST(request) {
    try {
        const supabase = await createClient()

        // Confirm the requester is authenticated.
        const {
            data: { claims },
            error: claimsError,
        } = await supabase.auth.getClaims()

        if (claimsError || !claims?.sub) {
            return NextResponse.json(
                { error: 'Authentication required.' },
                { status: 401 }
            )
        }

        // Confirm the requester is an admin.
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', claims.sub)
            .single()

        if (profileError || profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required.' },
                { status: 403 }
            )
        }

        const body = await request.json()

        const name = body.name?.trim()
        const email = body.email?.trim().toLowerCase()
        const phone = body.phone

        if (!name || !email || !phone) {
            return NextResponse.json(
                {
                    error: 'Full name, phone number and email are required.',
                },
                { status: 400 }
            )
        }

        const normalizedPhone = normalizeZimbabwePhone(phone)

        if (!normalizedPhone) {
            return NextResponse.json(
                {
                    error:
                        'Please enter a valid Zimbabwe mobile number, e.g. 0771234567.',
                },
                { status: 400 }
            )
        }

        const adminSupabase = createAdminClient()

        /*
         * Prevent multiple active invitations for the same email.
         */
        const { data: existingInvite, error: existingInviteError } =
            await adminSupabase
                .from('rider_invitations')
                .select('id')
                .eq('email', email)
                .is('used_at', null)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle()

        if (existingInviteError) {
            console.error(existingInviteError)

            return NextResponse.json(
                { error: 'Could not check existing invitations.' },
                { status: 500 }
            )
        }

        if (existingInvite) {
            return NextResponse.json(
                {
                    error:
                        'An active invitation already exists for this email address.',
                },
                { status: 409 }
            )
        }

        /*
         * Generate a cryptographically secure invitation token.
         */
        const rawToken = crypto.randomBytes(32).toString('hex')

        const tokenHash = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex')

        /*
         * Invitation expires after 48 hours.
         */
        const expiresAt = new Date(
            Date.now() + 48 * 60 * 60 * 1000
        ).toISOString()

        const { data: invitation, error: invitationError } =
            await adminSupabase
                .from('rider_invitations')
                .insert({
                    name,
                    phone: normalizedPhone,
                    email,
                    token_hash: tokenHash,
                    expires_at: expiresAt,
                    created_by: claims.sub,
                })
                .select('id, name, phone, email, expires_at')
                .single()

        if (invitationError) {
            console.error(invitationError)

            return NextResponse.json(
                { error: 'Could not create rider invitation.' },
                { status: 500 }
            )
        }

        /*
         * Build the invitation URL.
         *
         * In production, set NEXT_PUBLIC_APP_URL to your real domain.
         */
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            'http://localhost:3000'

        const inviteUrl =
            `${appUrl}/rider/invite/${rawToken}`

        return NextResponse.json({
            success: true,
            invitation: {
                id: invitation.id,
                name: invitation.name,
                phone: invitation.phone,
                email: invitation.email,
                expiresAt: invitation.expires_at,
                inviteUrl,
            },
        })
    } catch (error) {
        console.error('Rider invitation error:', error)

        return NextResponse.json(
            { error: 'Unexpected server error.' },
            { status: 500 }
        )
    }
}