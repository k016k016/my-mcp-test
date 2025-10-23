// APPドメイン用レイアウト（ユーザーアプリケーション）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import LogoutButton from '@/components/LogoutButton'
import SessionMonitor from '@/components/SessionMonitor'

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

  // ユーザーが所属する組織を取得（role付き）
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(
      `
      role,
      organization:organizations (
        id,
        name
      )
    `
    )
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // organizationsをrole付きのフラット配列に変換
  const organizationsWithRole = (memberships || []).map((m: any) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
  }))

  // 現在の組織IDを取得
  let currentOrgId = await getCurrentOrganizationId()

  // 現在の組織が設定されていない、または無効な場合は最初の組織を使用
  if (!currentOrgId || !organizationsWithRole.find((org: any) => org.id === currentOrgId)) {
    currentOrgId = organizationsWithRole[0]?.id || null
    // Cookieの設定はServer Actionで行う必要があるため、ここでは設定しない
  }

  // 現在の組織でのロールを取得
  const currentMembership = memberships?.find(
    (m: any) => m.organization && 'id' in m.organization && m.organization.id === currentOrgId
  )
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* セッション監視（ログアウト検知時に自動リダイレクト） */}
      <SessionMonitor />

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
                  href="/settings/profile"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  プロフィール設定
                </a>
                <a
                  href="/organization"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  組織情報
                </a>
                {isAdmin && (
                  <a
                    href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    管理画面
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 組織切り替え（複数組織に所属している場合のみ表示） */}
              {organizationsWithRole.length > 1 && currentOrgId && (
                <div className="hidden sm:block">
                  <OrganizationSwitcher
                    organizations={organizationsWithRole}
                    currentOrganizationId={currentOrgId}
                    data-testid="organization-switcher"
                  />
                </div>
              )}

              {/* ユーザーメニュー */}
              <div data-testid="user-menu" className="flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-xl">
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
