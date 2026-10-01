'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function SupabaseTest() {
    const [status, setStatus] = useState('Testing Supabase...')

    useEffect(() => {
        async function testConnection() {
            const supabase = createClient()

            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, role')
                .limit(1)

            if (error) {
                setStatus(`❌ Supabase error: ${error.message}`)
                console.error(error)
                return
            }

            setStatus(`✅ Supabase connected! Returned ${data.length} profile(s).`)
            console.log('Supabase data:', data)
        }

        testConnection()
    }, [])

    return (
        <main className="flex min-h-screen items-center justify-center">
            <div className="rounded-xl border p-8">
                <h1 className="mb-4 text-2xl font-bold">
                    KwiQue Supabase Test
                </h1>

                <p>{status}</p>
            </div>
        </main>
    )
}