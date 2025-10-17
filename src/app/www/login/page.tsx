// ログインページ（WWWドメイン）
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()

      // 既にログインしているかチェック
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // ログイン済みの場合は権限に応じたページにリダイレクト
      if (user) {
        // 組織を取得
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .limit(1)

        if (memberships && memberships.length > 0) {
          const isAdmin = memberships[0].role === 'owner' || memberships[0].role === 'admin'

          if (isAdmin) {
            const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.local.test:3000'
            window.location.href = adminUrl
          } else {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.local.test:3000'
            window.location.href = appUrl
          }
          return
        }
      }

      setLoading(false)
    }

    checkUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未ログインの場合はログインフォームを表示
  return <LoginForm />
}
