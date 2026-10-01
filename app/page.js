'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.replace('/customer')
      } else {
        router.replace('/signup')
      }
    }

    checkAuth()
  }, [router])

  return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          {/* KwiQue loading icon */}
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute h-14 w-14 rounded-full bg-black/10 animate-ping" />

            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#ed1c24] shadow-lg">
                        <span className="text-lg font-bold tracking-tight text-white">
                            K
                        </span>
            </div>
          </div>

          <p className="text-sm font-medium text-slate-500">
            Loading KwiQue...
          </p>
        </div>
      </main>
  )
}