// OPSドメイン用レイアウト（運用画面）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import LogoutButton from '@/components/LogoutButton'

export const metadata: Metadata = {
  title: 'Operations Center - Example',
  description: 'Example Operations Center。システム運用と監視を行います。',
}

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // パスをチェックしてログインページの場合は認証チェックをスキップ
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') || ''
  const isLoginPage = pathname === '/login'

  if (!isLoginPage) {
    if (!user) {
      // 未認証の場合はOPSログインページへ
      redirect('/login')
    }

    // 運用担当者権限チェック
    const isOpsUser = user.user_metadata?.is_ops === true
    if (!isOpsUser) {
      // 運用担当者以外はWWWログインページへ
      const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
      redirect(`${wwwUrl}/login`)
    }
  }

  // ログインページの場合はレイアウトをスキップ
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* ロゴ */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">
                  Operations Center
                </span>
              </div>

              {/* ナビゲーション */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ダッシュボード
                </a>
                <a
                  href="/organizations"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  組織管理
                </a>
                <a
                  href="/users"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ユーザー管理
                </a>
                <a
                  href="/monitoring"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  システム監視
                </a>
                <a
                  href="/logs"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ログ
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* ユーザー情報 */}
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-xl">
                <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-md">
                  {user?.email?.charAt(0).toUpperCase() || 'O'}
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-semibold text-white">
                    {user?.user_metadata?.full_name || 'Operations User'}
                  </div>
                  <div className="text-xs text-gray-400">{user?.email || 'No email'}</div>
                </div>
              </div>

              {/* ログアウトボタン */}
              <LogoutButton />
            </div>
          </div>
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
