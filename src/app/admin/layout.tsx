// ADMINドメイン用レイアウト（管理画面）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import LogoutButton from '@/components/LogoutButton'

export const metadata: Metadata = {
  title: '管理画面 - Example Admin',
  description: 'Example Admin管理画面。組織とメンバーの管理、設定を行います。',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  // 管理者権限チェック
  const currentMembership = memberships?.find(
    (m: any) => m.organization && 'id' in m.organization && m.organization.id === currentOrgId
  )
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  if (!isAdmin) {
    // 管理者権限がない場合はAPP画面へ
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
    redirect(`${appUrl}?message=管理者権限がありません`)
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* サイドバー */}
      <div className="flex">
        <aside className="w-64 bg-gray-900 text-white min-h-screen shadow-xl">
          <div className="p-6">
            {/* ロゴ */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold">Admin Panel</span>
            </div>

            {/* 組織切り替え */}
            {organizations.length > 0 && currentOrgId && (
              <div className="mb-6">
                <OrganizationSwitcher
                  organizations={organizations}
                  currentOrganizationId={currentOrgId}
                />
              </div>
            )}

            {/* ナビゲーション */}
            <nav className="space-y-2">
              <a
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                ダッシュボード
              </a>
              <a
                href="/users"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                ユーザー管理
              </a>
              <a
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                組織設定
              </a>
              <a
                href="/subscription"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                サブスクリプション
              </a>
            </nav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">管理画面</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {organizations.find((org: any) => org.id === currentOrgId)?.name || '組織を選択してください'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* ユーザー情報 */}
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-100 rounded-xl">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-md">
                    {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-sm font-semibold text-gray-800">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </div>

                {/* ログアウトボタン */}
                <LogoutButton />
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 bg-gray-50">{children}</main>
        </div>
      </div>
    </div>
  )
}
