'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthPending() {
  const router = useRouter()
  
  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    // セッションが確立されるまでリトライ
    let attempts = 0
    const maxAttempts = 10

    const checkSession = async () => {
      if (!mounted || attempts >= maxAttempts) {
        if (mounted && attempts >= maxAttempts) {
          // 最大試行回数を超えた場合はログインページへ
          router.replace('/login')
        }
        return
      }

      attempts++
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // セッション確認できたらページをリフレッシュ
        router.refresh()
      } else {
        // まだセッションがない場合は100ms後に再試行
        setTimeout(checkSession, 100)
      }
    }

    // 最初のチェックを400ms後に開始（初回のCookie同期を待つ）
    const initialTimer = setTimeout(checkSession, 400)

    return () => {
      mounted = false
      clearTimeout(initialTimer)
    }
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-sm text-gray-600">セッションを確認中...</p>
      </div>
    </div>
  )
}
