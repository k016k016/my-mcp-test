// 組織情報の閲覧ページ（member権限用、読み取り専用）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { getCurrentOrganizationId } from '@/lib/organization/current'

export default async function OrganizationInfoPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
  }

  // 現在の組織IDを取得
  const organizationId = await getCurrentOrganizationId()

  if (!organizationId) {
    redirect(`${env.NEXT_PUBLIC_WWW_URL}`)
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  if (!organization) {
    redirect(`${env.NEXT_PUBLIC_WWW_URL}`)
  }

  // メンバー数を取得
  const { count: membersCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // ユーザーの権限を取得
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  const role = membership?.role || 'member'
  const isAdmin = role === 'owner' || role === 'admin'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          組織情報
        </h1>
        <p className="text-gray-700 mt-3 text-lg">所属している組織の情報を確認できます</p>
      </div>

      {/* member権限の場合の注意メッセージ */}
      {!isAdmin && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-blue-500 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-blue-800 font-medium">
                組織情報の編集は管理者のみ可能です
              </p>
              <p className="text-blue-700 text-sm mt-1">
                編集が必要な場合は、組織のオーナーまたは管理者にお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 組織情報 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">基本情報</h2>
          {isAdmin && (
            <a
              href={`${env.NEXT_PUBLIC_ADMIN_URL}/settings`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-all"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              管理画面で編集
            </a>
          )}
        </div>

        <div className="space-y-6">
          {/* 組織名 */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              組織名
            </label>
            <div className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-lg font-medium">
              {organization.name}
            </div>
          </div>

          {/* 組織ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              組織ID
            </label>
            <div className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm font-mono">
              {organization.id}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              API連携やサポート問い合わせ時に使用します
            </p>
          </div>

          {/* メンバー数 */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              メンバー数
            </label>
            <div className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-gray-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-2xl font-bold text-gray-900">{membersCount || 0}</span>
                <span className="text-gray-600 ml-2">名</span>
              </div>
            </div>
          </div>

          {/* プラン */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              プラン
            </label>
            <div className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-gray-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                  <span className="text-xl font-bold text-gray-900 capitalize">
                    {organization.subscription_plan}
                  </span>
                </div>
                {isAdmin && (
                  <a
                    href={`${env.NEXT_PUBLIC_ADMIN_URL}/subscription`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    プラン変更 →
                  </a>
                )}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    organization.subscription_status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {organization.subscription_status === 'active'
                    ? '有効'
                    : organization.subscription_status}
                </span>
              </div>
            </div>
          </div>

          {/* 作成日 */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              作成日
            </label>
            <div className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
              {new Date(organization.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* あなたの権限 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">あなたの権限</h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <svg
              className="w-8 h-8 text-purple-500 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {role === 'owner' ? 'オーナー' : role === 'admin' ? '管理者' : 'ユーザー'}
              </div>
              <div className="text-sm text-gray-600">
                {role === 'owner'
                  ? 'すべての管理機能にアクセスできます'
                  : role === 'admin'
                  ? 'メンバー管理と組織設定にアクセスできます'
                  : '一般機能のみ利用できます'}
              </div>
            </div>
          </div>
          <div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
                role === 'owner'
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : role === 'admin'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            >
              {role === 'owner' ? '👑 オーナー' : role === 'admin' ? 'Admin' : 'Member'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
