// プラン選択ページ（オンボーディング）
'use client'

import { PLANS, formatPrice } from '@/lib/plans/config'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LicensePlanType } from '@/types/database'

export default function SelectPlanPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<LicensePlanType | null>(null)

  function handleSelectPlan(planId: LicensePlanType) {
    setSelectedPlan(planId)
    // 決済ページへ遷移
    router.push(`/onboarding/payment?plan=${planId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            プランを選択してください
          </h1>
          <p className="text-lg text-gray-600">
            チームの規模に合わせて最適なプランをお選びください
          </p>
        </div>

        {/* プランカード一覧 */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl ${
                plan.highlighted
                  ? 'ring-2 ring-blue-600 transform scale-105'
                  : 'hover:scale-102'
              }`}
            >
              {/* おすすめバッジ */}
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-sm font-semibold rounded-bl-lg">
                  おすすめ
                </div>
              )}

              <div className="p-8">
                {/* プラン名 */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h2>

                {/* 説明 */}
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* 料金 */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="ml-2 text-gray-600">/月</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {plan.seats}シート含む
                  </p>
                </div>

                {/* 機能リスト */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 選択ボタン */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectedPlan === plan.id}
                  className={`w-full py-3 px-6 rounded-md font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                      : 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400'
                  } disabled:cursor-not-allowed`}
                >
                  {selectedPlan === plan.id ? '選択中...' : 'このプランを選択'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* エンタープライズ向け案内 */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              エンタープライズプラン
            </h3>
            <p className="text-gray-600 mb-4">
              より大規模なチーム向けのカスタムプランをご用意しています
            </p>
            <a
              href="mailto:sales@example.com"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              お問い合わせ
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
              </svg>
            </a>
          </div>
        </div>

        {/* 追加ユーザー料金の案内 */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            プランのシート数を超える追加ユーザーは、
            <span className="font-semibold text-gray-900">
              1人あたり¥1,500/月
            </span>
            で追加可能です
          </p>
        </div>
      </div>
    </div>
  )
}
