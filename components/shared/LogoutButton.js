'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LogoutButton() {
    const router = useRouter()

    async function handleLogout() {
        const supabase = createClient()

        const { error } = await supabase.auth.signOut()

        if (error) {
            console.error('Logout failed:', error)
            return
        }

        router.replace('/login')
        router.refresh()
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium hover:opacity-70"
        >
            Log out
        </button>
    )
}