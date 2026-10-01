import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '../../../../../lib/supabase/admin'

export async function POST(request) {
    try {
        const body = await request.json()

        const token = body.token?.trim()
        const password = body.password

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Invitation token and password are required.' },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters.' },
                { status: 400 }
            )
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')

        const supabase = createAdminClient()

        // Find a valid, unused invitation.
        const { data: invitation, error: invitationError } =
            await supabase
                .from('rider_invitations')
                .select(
                    'id, name, phone, email, expires_at, used_at'
                )
                .eq('token_hash', tokenHash)
                .is('used_at', null)
                .single()

        if (invitationError || !invitation) {
            return NextResponse.json(
                {
                    error:
                        'This invitation is invalid or has already been used.',
                },
                { status: 400 }
            )
        }

        // Check expiration.
        if (new Date(invitation.expires_at) <= new Date()) {
            return NextResponse.json(
                {
                    error:
                        'This invitation has expired. Please ask the KwiQue administrator for a new invitation.',
                },
                { status: 400 }
            )
        }

        /*
         * Create the Supabase authentication account.
         *
         * The existing handle_new_user() trigger will automatically
         * create the initial profiles row.
         */
        const {
            data: authData,
            error: authError,
        } = await supabase.auth.admin.createUser({
            email: invitation.email,
            password,
            email_confirm: true,
            user_metadata: {
                name: invitation.name,
                phone: invitation.phone,
            },
        })

        if (authError) {
            console.error('Rider auth creation failed:', authError)

            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            )
        }

        const userId = authData.user.id

        /*
         * The database trigger initially creates the profile with
         * role = customer.
         *
         * Change it to rider immediately because this is a
         * controlled rider invitation.
         */
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                name: invitation.name,
                phone: invitation.phone,
                email: invitation.email,
                role: 'rider',
            })
            .eq('id', userId)

        if (profileError) {
            console.error('Rider profile creation failed:', profileError)

            await supabase.auth.admin.deleteUser(userId)

            return NextResponse.json(
                {
                    error:
                        'The rider account could not be configured.',
                },
                { status: 500 }
            )
        }

        /*
         * Create the operational rider record.
         */
        const { error: riderError } = await supabase
            .from('riders')
            .insert({
                user_id: userId,
                availability_status: 'offline',
            })

        if (riderError) {
            console.error('Rider record creation failed:', riderError)

            await supabase
                .from('profiles')
                .delete()
                .eq('id', userId)

            await supabase.auth.admin.deleteUser(userId)

            return NextResponse.json(
                {
                    error:
                        'The rider account was created but could not be activated.',
                },
                { status: 500 }
            )
        }

        /*
         * Mark the invitation as used.
         */
        const { error: usedError } = await supabase
            .from('rider_invitations')
            .update({
                used_at: new Date().toISOString(),
            })
            .eq('id', invitation.id)
            .is('used_at', null)

        if (usedError) {
            console.error(
                'Failed to mark rider invitation as used:',
                usedError
            )
        }

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                name: invitation.name,
                phone: invitation.phone,
                email: invitation.email,
                role: 'rider',
            },
        })
    } catch (error) {
        console.error('Rider activation error:', error)

        return NextResponse.json(
            { error: 'Unexpected server error.' },
            { status: 500 }
        )
    }
}