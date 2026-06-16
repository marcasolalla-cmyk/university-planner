'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { searchParams } = new URL(window.location.href)
    const code = searchParams.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          router.push('/')
          router.refresh()
        } else {
          router.push('/login')
        }
      })
    } else {
      router.push('/login')
    }
  }, [])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Iniciando sesión...</p>
      </div>
    </div>
  )
}
