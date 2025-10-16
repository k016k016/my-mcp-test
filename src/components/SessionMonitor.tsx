// セッション状態を監視し、ログアウトを検知したら自動リダイレクトするコンポーネント
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SessionMonitorProps {
  /**
   * ログアウト検知時のリダイレクト先URL
   * 指定がない場合はWWWドメインのログインページにリダイレクト
   */
  redirectTo?: string
}

export default function SessionMonitor({ redirectTo }: SessionMonitorProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // ログアウトイベントを検知
      if (event === 'SIGNED_OUT') {
        // 既にリダイレクト中の場合は何もしない
        if (sessionStorage.getItem('logout-redirecting') === 'true') {
          return
        }

        console.log('[SessionMonitor] ログアウトを検知しました。リダイレクトします...')

        // リダイレクト中フラグを設定
        sessionStorage.setItem('logout-redirecting', 'true')

        // リダイレクト先を決定
        const targetUrl = redirectTo || `${process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'}/login`

        // クライアント側のキャッシュをクリア
        router.refresh()

        // ログインページにリダイレクト
        window.location.href = targetUrl
      }

      // セッションの期限切れも検知
      if (event === 'TOKEN_REFRESHED' && !session) {
        // 既にリダイレクト中の場合は何もしない
        if (sessionStorage.getItem('logout-redirecting') === 'true') {
          return
        }

        console.log('[SessionMonitor] セッションの更新に失敗しました。リダイレクトします...')

        // リダイレクト中フラグを設定
        sessionStorage.setItem('logout-redirecting', 'true')

        const targetUrl = redirectTo || `${process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'}/login`
        window.location.href = targetUrl
      }
    })

    // クリーンアップ: コンポーネントのアンマウント時にリスナーを解除
    return () => {
      subscription.unsubscribe()
    }
  }, [redirectTo, router])

  // このコンポーネントはUIを持たない（監視のみ）
  return null
}
