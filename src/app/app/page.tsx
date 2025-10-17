// APPドメインのトップページ
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { getCurrentOrganizationId } from '@/lib/organization/current'

type AppPageProps = {
  searchParams: { error?: string }
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const resolvedSearchParams = await searchParams
  console.log('[APP Page] Starting APP page render')
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[APP Page] User check:', user?.id || 'none')

  if (!user) {
    console.log('[APP Page] No user, redirecting to WWW login')
    // 未認証の場合はWWWドメインのログインページへ
    redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
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
        subscription_plan,
        subscription_status
      )
    `
    )
    .eq('user_id', user.id)

  console.log('[APP Page] Memberships:', memberships?.length || 0)

  // 仕様上、組織未所属ユーザーは存在しない想定
  if (!memberships || memberships.length === 0) {
    console.log('[APP Page] No memberships, redirecting to WWW')
    // 想定外フォールバック: WWWトップへ
    redirect(env.NEXT_PUBLIC_WWW_URL)
  }

  // Cookieから最後に選択した組織を取得
  const currentOrgId = await getCurrentOrganizationId()

  // 最後に選択した組織を探す
  let currentMembership = currentOrgId
    ? memberships.find((m) => m.organization && 'id' in m.organization && m.organization.id === currentOrgId)
    : null

  // 見つからない場合は最初の組織を使用（クッキーは後でServer Actionで設定）
  if (!currentMembership) {
    currentMembership = memberships[0]
  }

  const currentOrg = currentMembership.organization as any

  console.log('[APP Page] Current org:', currentOrg?.name || 'none')
  console.log('[APP Page] Rendering APP dashboard')

  return (
    <div>

      {/* エラーメッセージ */}
      {resolvedSearchParams.error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">{resolvedSearchParams.error}</p>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              ダッシュボード
            </h1>
            <p className="text-gray-700 mt-2 text-lg">{currentOrg.name}</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">ようこそ</div>
              <div className="text-lg font-semibold text-gray-900">{user.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ウェルカムカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* あなたの組織 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">あなたの組織</h3>
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{currentOrg.name}</p>
          <p className="text-sm text-gray-600">プラン: <span className="font-semibold capitalize">{currentOrg.subscription_plan}</span></p>
        </div>

        {/* あなたのロール */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">あなたのロール</h3>
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {currentMembership.role === 'owner' ? 'オーナー' :
             currentMembership.role === 'admin' ? '管理者' : 'ユーザー'}
          </p>
          <p className="text-sm text-gray-600">
            {currentMembership.role === 'owner' ? '全ての権限があります' :
             currentMembership.role === 'admin' ? '管理者権限があります' : '一般ユーザーです'}
          </p>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">クイックアクション</h3>
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="space-y-2">
            <a href="/settings/profile" className="block text-blue-600 hover:text-blue-700 font-medium text-sm">
              → プロフィール設定
            </a>
            {(currentMembership.role === 'owner' || currentMembership.role === 'admin') && (
              <a href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'}`} className="block text-blue-600 hover:text-blue-700 font-medium text-sm">
                → 管理画面へ
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ウェルカムメッセージ */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200 p-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">ようこそ！</h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              これはあなたのダッシュボードです。左側のメニューからプロフィール設定にアクセスできます。
              {(currentMembership.role === 'owner' || currentMembership.role === 'admin') && (
                <span className="block mt-2">
                  管理者権限をお持ちですので、クイックアクションから管理画面にアクセスして組織の設定やメンバー管理を行うことができます。
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
