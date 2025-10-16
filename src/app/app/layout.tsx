// APPドメイン用レイアウト（ユーザーアプリケーション）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import LogoutButton from '@/components/LogoutButton'

export const metadata: Metadata = {
  title: 'ダッシュボード - Example App',
  description: 'Example Appのダッシュボード。プロジェクト管理とコラボレーションを効率化します。',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login`)
  }

  // ユーザーが所属する組織を取得
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(
      `
      role,
      organization:organizations (
        id,
        name,
        slug
      )
    `
    )
    .eq('user_id', user.id)

  const organizations = (memberships || []).map((m: any) => m.organization)

  // 現在の組織IDを取得
  let currentOrgId = await getCurrentOrganizationId()

  // 現在の組織が設定されていない、または無効な場合は最初の組織を使用
  if (!currentOrgId || !organizations.find((org: any) => org.id === currentOrgId)) {
    currentOrgId = organizations[0]?.id || null
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* ロゴ */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Example App
                </span>
              </div>

              {/* ナビゲーション */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  ダッシュボード
                </a>
                <a
                  href="/projects"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  プロジェクト
                </a>
                <a
                  href="/settings"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  設定
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 組織切り替え */}
              {organizations.length > 0 && currentOrgId && (
                <div className="hidden sm:block">
                  <OrganizationSwitcher
                    organizations={organizations}
                    currentOrganizationId={currentOrgId}
                  />
                </div>
              )}

              {/* ユーザーメニュー */}
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-xl">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-md">
                  {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-semibold text-slate-800">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>

              {/* ログアウトボタン */}
              <LogoutButton />
            </div>
          </div>
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
