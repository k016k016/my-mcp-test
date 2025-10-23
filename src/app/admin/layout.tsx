// ADMINドメイン用レイアウト（管理画面）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import LogoutButton from '@/components/LogoutButton'
import { env } from '@/lib/env'
import SessionMonitor from '@/components/SessionMonitor'

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
    const wwwBase = (env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000').trim()
    const to = new URL('/login', wwwBase)
    redirect(to.toString())
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
  console.log('[ADMIN Layout] Raw currentOrgId from cookie:', currentOrgId)

  // 現在の組織が設定されていない、または無効な場合は最初の組織を使用
  if (!currentOrgId || !organizationsWithRole.find((org: any) => org.id === currentOrgId)) {
    console.log('[ADMIN Layout] Setting currentOrgId to first organization:', organizationsWithRole[0]?.id)
    currentOrgId = organizationsWithRole[0]?.id || null
  }

  // 管理者権限チェック
  const currentMembership = memberships?.find(
    (m: any) => m.organization && 'id' in m.organization && m.organization.id === currentOrgId
  )
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  console.log('[ADMIN Layout] User ID:', user.id)
  console.log('[ADMIN Layout] Memberships:', memberships)
  console.log('[ADMIN Layout] Current Org ID:', currentOrgId)
  console.log('[ADMIN Layout] Current Membership:', currentMembership)
  console.log('[ADMIN Layout] isAdmin:', isAdmin)

  if (!isAdmin) {
    // 管理者権限がない場合はAPP画面へ
    console.log('[ADMIN Layout] Redirecting to APP - no admin permission')
    const appBase = (env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000').trim()
    const to = new URL('/', appBase)
    to.searchParams.set('error', '管理者権限がありません')
    redirect(to.toString())
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* セッション監視（ログアウト検知時に自動リダイレクト） */}
      <SessionMonitor />

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

            {/* 組織切り替え（複数組織に所属している場合のみ表示） */}
            {organizationsWithRole.length > 1 && currentOrgId && (
              <div className="mb-6">
                <OrganizationSwitcher
                  organizations={organizationsWithRole}
                  currentOrganizationId={currentOrgId}
                  data-testid="organization-switcher"
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
                href="/members"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                メンバー管理
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

              {/* 区切り線 */}
              <div className="border-t border-gray-700 my-4"></div>

              <a
                href={process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                ユーザー画面へ
              </a>

              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'}/settings/profile`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                プロフィール設定
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
                  {organizationsWithRole.find((org: any) => org.id === currentOrgId)?.name || '組織を選択してください'}
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
