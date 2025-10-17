// サブスクリプション管理ページ（ADMINドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import SubscriptionCard from '@/components/SubscriptionCard'
import { env } from '@/lib/env'

export default async function SubscriptionPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwBase = (env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000').trim()
    redirect(new URL('/login', wwwBase).toString())
  }

  // 現在の組織IDを取得
  const organizationId = await getCurrentOrganizationId()

  if (!organizationId) {
    // 想定外フォールバック
    redirect(env.NEXT_PUBLIC_WWW_URL)
  }

  // 権限チェック（オーナーのみ）
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  const isOwner = currentMember?.role === 'owner'

  if (!isOwner) {
    const to = new URL('/', 'http://admin.local.test:3000')
    to.searchParams.set('error', 'オーナー権限が必要です')
    redirect(to.toString())
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  // 使用量制限を取得
  const { data: usageLimit } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('plan', organization?.subscription_plan || 'free')
    .single()

  // 現在の使用量を取得
  const { count: membersCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  return (
    <div className="max-w-6xl">
      {/* ヘッダーカード */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
          サブスクリプション管理
        </h1>
        <p className="text-gray-700 mt-3 text-lg">プランと使用量を管理します</p>
      </div>

      {/* 現在のプラン */}
      <div className="mb-8">
        <SubscriptionCard
          organization={organization as any}
          usageLimit={usageLimit as any}
          currentUsage={{ members: membersCount || 0, projects: 0, storage_gb: 0, api_calls: 0 }}
        />
      </div>

      {/* 使用量の詳細 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">使用量の詳細</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* メンバー数 */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">メンバー数</h3>
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-900">{membersCount || 0}</span>
              <span className="text-xl text-gray-600 mb-1">
                / {usageLimit?.max_members === -1 ? '無制限' : usageLimit?.max_members || 3}
              </span>
            </div>
            {usageLimit?.max_members !== -1 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(((membersCount || 0) / (usageLimit?.max_members || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {usageLimit?.max_members && membersCount && membersCount >= usageLimit.max_members
                    ? '上限に達しています'
                    : `あと${(usageLimit?.max_members || 0) - (membersCount || 0)}人追加できます`}
                </p>
              </div>
            )}
          </div>

          {/* ストレージ */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">ストレージ</h3>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-900">0</span>
              <span className="text-xl text-gray-600 mb-1">GB</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              上限: {usageLimit?.max_storage_gb === -1 ? '無制限' : `${usageLimit?.max_storage_gb || 1} GB`}
            </p>
          </div>
        </div>
      </div>

      {/* 利用可能なプラン */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">利用可能なプラン</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Freeプラン */}
          <div className={`relative p-6 rounded-xl border-2 ${
            organization?.subscription_plan === 'free'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 bg-white'
          }`}>
            {organization?.subscription_plan === 'free' && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                  現在のプラン
                </span>
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
            <p className="text-4xl font-bold text-gray-900 mb-6">
              ¥0<span className="text-lg text-gray-600 font-normal">/月</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">メンバー 3人まで</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">ストレージ 1GB</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">基本機能</span>
              </li>
            </ul>
            {organization?.subscription_plan !== 'free' && (
              <button className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                ダウングレード
              </button>
            )}
          </div>

          {/* Standardプラン */}
          <div className={`relative p-6 rounded-xl border-2 ${
            organization?.subscription_plan === 'standard'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 bg-white'
          }`}>
            {organization?.subscription_plan === 'standard' && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                  現在のプラン
                </span>
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Standard</h3>
            <p className="text-4xl font-bold text-gray-900 mb-6">
              ¥5,000<span className="text-lg text-gray-600 font-normal">/月</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">メンバー 10人まで</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">ストレージ 10GB</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">全機能利用可能</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">メールサポート</span>
              </li>
            </ul>
            <button
              disabled={organization?.subscription_plan === 'standard'}
              className="w-full py-2 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {organization?.subscription_plan === 'standard' ? '現在のプラン' : 'アップグレード'}
            </button>
          </div>

          {/* Enterpriseプラン */}
          <div className={`relative p-6 rounded-xl border-2 ${
            organization?.subscription_plan === 'enterprise'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 bg-white'
          }`}>
            {organization?.subscription_plan === 'enterprise' && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                  現在のプラン
                </span>
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
            <p className="text-4xl font-bold text-gray-900 mb-6">
              お問い合わせ
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">メンバー 無制限</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">ストレージ 無制限</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">全機能 + カスタマイズ</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">優先サポート + SLA</span>
              </li>
            </ul>
            <button
              disabled={organization?.subscription_plan === 'enterprise'}
              className="w-full py-2 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {organization?.subscription_plan === 'enterprise' ? '現在のプラン' : 'お問い合わせ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
