// APPドメインのトップページ
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import { InitializeOrganization } from '@/components/initialize-organization'

type AppPageProps = {
  searchParams: { error?: string }
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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
        slug,
        subscription_plan,
        subscription_status,
        trial_ends_at
      )
    `
    )
    .eq('user_id', user.id)

  // 組織が1つもない場合は組織作成ページへ
  if (!memberships || memberships.length === 0) {
    redirect('/onboarding/create-organization')
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
  const needsOrgCookieUpdate = !currentOrgId && currentOrg?.id

  return (
    <div>
      {/* 組織クッキーの初期化（必要な場合のみ） */}
      {needsOrgCookieUpdate && <InitializeOrganization organizationId={currentOrg.id} />}

      {/* エラーメッセージ */}
      {searchParams.error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">{searchParams.error}</p>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ダッシュボード
            </h1>
            <p className="text-slate-600 mt-2 text-lg">{currentOrg.name}</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-500">ようこそ</div>
              <div className="text-lg font-semibold text-slate-700">{user.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ダッシュボードカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* プロジェクト数 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-blue-100 text-sm font-medium">総プロジェクト数</div>
            <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-5xl font-bold">0</div>
          <div className="text-blue-100 text-sm mt-2">現在進行中</div>
        </div>

        {/* アクティブタスク */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-purple-100 text-sm font-medium">アクティブタスク</div>
            <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-5xl font-bold">0</div>
          <div className="text-purple-100 text-sm mt-2">今週の予定</div>
        </div>

        {/* チームメンバー */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-emerald-100 text-sm font-medium">チームメンバー</div>
            <svg className="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="text-5xl font-bold">{memberships.length}</div>
          <div className="text-emerald-100 text-sm mt-2">アクティブユーザー</div>
        </div>

        {/* 完了率 */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-amber-100 text-sm font-medium">完了率</div>
            <svg className="w-8 h-8 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-5xl font-bold">-</div>
          <div className="text-amber-100 text-sm mt-2">今月の進捗</div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-8">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            最近のアクティビティ
          </h2>
        </div>
        <div className="p-8">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-lg">アクティビティはまだありません</p>
            <p className="text-slate-400 text-sm mt-2">プロジェクトを作成すると、ここにアクティビティが表示されます</p>
          </div>
        </div>
      </div>

      {/* トライアル情報 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🎉
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">トライアル期間中</h3>
            <p className="text-blue-100 text-lg">
              現在、14日間の無料トライアルをご利用中です。全ての機能を無料でお試しいただけます。
            </p>
            <div className="mt-4 flex gap-4">
              <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                プランをアップグレード
              </button>
              <button className="px-6 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors">
                詳細を見る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
