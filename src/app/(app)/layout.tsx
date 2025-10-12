// APPドメイン用レイアウト（ユーザーアプリケーション）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import { signOut } from '@/app/actions/auth'

export const metadata: Metadata = {
  title: 'Dashboard - Example',
  description: 'ユーザーアプリケーション',
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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-xl font-bold">Example App</div>
              <div className="flex items-center gap-4">
                <a href="/" className="text-sm text-gray-700 hover:text-gray-900">
                  ダッシュボード
                </a>
                <a href="/projects" className="text-sm text-gray-700 hover:text-gray-900">
                  プロジェクト
                </a>
                <a href="/settings" className="text-sm text-gray-700 hover:text-gray-900">
                  設定
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 組織切り替え */}
              {organizations.length > 0 && currentOrgId && (
                <OrganizationSwitcher
                  organizations={organizations}
                  currentOrganizationId={currentOrgId}
                />
              )}

              {/* ユーザーメニュー */}
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-medium">
                  {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-700">{profile?.full_name || user.email}</span>
              </div>

              {/* ログアウトボタン */}
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
