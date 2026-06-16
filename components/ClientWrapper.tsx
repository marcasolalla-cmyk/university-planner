'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import type { User } from '@supabase/supabase-js'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/auth')

  if (user && !isAuthPage) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar user={user} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {children}
    </div>
  )
}
