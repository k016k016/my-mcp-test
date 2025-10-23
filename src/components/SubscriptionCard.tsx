// サブスクリプションカードコンポーネント
'use client'

import type { Organization, UsageLimit } from '@/types/database'

interface SubscriptionCardProps {
  organization: Organization | null
  usageLimit: UsageLimit | null
  currentUsage: {
    members: number
    projects: number
    storage_gb: number
    api_calls: number
  }
}

export default function SubscriptionCard({
  organization,
  usageLimit,
  currentUsage,
}: SubscriptionCardProps) {
  if (!organization || !usageLimit) {
    return <div>読み込み中...</div>
  }

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free':
        return '無料プラン'
      case 'pro':
        return 'Proプラン'
      case 'enterprise':
        return 'Enterpriseプラン'
      default:
        return plan
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">有効</span>
      case 'past_due':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">支払い期限超過</span>
      case 'canceled':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">キャンセル済み</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? '無制限' : limit.toLocaleString()
  }

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0
    return Math.min((current / max) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-6">
      {/* 現在のプラン */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{getPlanName(organization.subscription_plan)}</h2>
          </div>
          {getStatusBadge(organization.subscription_status)}
        </div>

        {organization.subscription_plan === 'free' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              🚀 より多くの機能を利用するには、Proプランまたはアップグレードをご検討ください。
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            プランを変更
          </button>
          {organization.chargebee_customer_id && (
            <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              請求履歴を見る
            </button>
          )}
        </div>
      </div>

      {/* 使用量 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">使用量</h3>
        <div className="space-y-6">
          {/* メンバー数 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">メンバー数</span>
              <span className="text-gray-600">
                {currentUsage.members} / {formatLimit(usageLimit.max_members)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(
                  getUsagePercentage(currentUsage.members, usageLimit.max_members)
                )}`}
                style={{
                  width: `${getUsagePercentage(currentUsage.members, usageLimit.max_members)}%`,
                }}
              />
            </div>
          </div>

          {/* プロジェクト数 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">プロジェクト数</span>
              <span className="text-gray-600">
                {currentUsage.projects} / {formatLimit(usageLimit.max_projects)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(
                  getUsagePercentage(currentUsage.projects, usageLimit.max_projects)
                )}`}
                style={{
                  width: `${getUsagePercentage(currentUsage.projects, usageLimit.max_projects)}%`,
                }}
              />
            </div>
          </div>

          {/* ストレージ */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">ストレージ</span>
              <span className="text-gray-600">
                {currentUsage.storage_gb}GB / {formatLimit(usageLimit.max_storage_gb)}GB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(
                  getUsagePercentage(currentUsage.storage_gb, usageLimit.max_storage_gb)
                )}`}
                style={{
                  width: `${getUsagePercentage(currentUsage.storage_gb, usageLimit.max_storage_gb)}%`,
                }}
              />
            </div>
          </div>

          {/* API呼び出し数 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">API呼び出し数（月間）</span>
              <span className="text-gray-600">
                {currentUsage.api_calls.toLocaleString()} /{' '}
                {formatLimit(usageLimit.max_api_calls_per_month)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(
                  getUsagePercentage(currentUsage.api_calls, usageLimit.max_api_calls_per_month)
                )}`}
                style={{
                  width: `${getUsagePercentage(
                    currentUsage.api_calls,
                    usageLimit.max_api_calls_per_month
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 機能一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">利用可能な機能</h3>
        <ul className="space-y-3">
          {usageLimit.features.analytics && (
            <li className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              高度な分析機能
            </li>
          )}
          {usageLimit.features.api_access && (
            <li className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              API アクセス
            </li>
          )}
          {usageLimit.features.priority_support && (
            <li className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              優先サポート
            </li>
          )}
          {usageLimit.features.custom_domain && (
            <li className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              カスタムドメイン
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
