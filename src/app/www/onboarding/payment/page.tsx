// 決済ページ（オンボーディング）
'use client'

import { getPlanById, formatPrice } from '@/lib/plans/config'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import type { LicensePlanType } from '@/types/database'

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') as LicensePlanType | null

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // プラン情報を取得
  const plan = planId ? getPlanById(planId) : null

  useEffect(() => {
    // プランが選択されていない場合はプラン選択ページに戻す
    if (!planId || !plan) {
      router.push('/onboarding/select-plan')
    }
  }, [planId, plan, router])

  // モック決済処理
  async function handleMockPayment() {
    setIsProcessing(true)
    setError(null)

    try {
      // モック: 2秒待機して決済完了をシミュレート
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 決済成功後、組織作成ページへ遷移
      // 実際の実装では、ここでWebhookが発火してorganization_licensesが作成される
      router.push(`/onboarding/create-organization?plan=${planId}`)
    } catch (err) {
      setError('決済処理中にエラーが発生しました。もう一度お試しください。')
      setIsProcessing(false)
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">プラン情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            お支払い情報
          </h1>
          <p className="text-gray-600">選択したプランの内容を確認してください</p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* プラン情報 */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  選択プラン: {plan.name}
                </h2>
                <p className="text-gray-600 mt-1">{plan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price)}
                </div>
                <div className="text-sm text-gray-600">/月</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-gray-50 rounded-md">
              <div>
                <p className="text-sm text-gray-600">含まれるシート数</p>
                <p className="text-lg font-semibold text-gray-900">
                  {plan.seats}シート
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">現在の使用</p>
                <p className="text-lg font-semibold text-gray-900">
                  0/{plan.seats}（あなた）
                </p>
              </div>
            </div>
          </div>

          {/* モック決済フォーム */}
          <div className="p-8">
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      開発環境（モックモード）
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      これはモック決済です。実際の決済は行われません。「支払いを確定」ボタンをクリックすると、決済完了をシミュレートします。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* モック決済情報 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カード番号（モック）
                </label>
                <input
                  type="text"
                  value="4242 4242 4242 4242"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効期限（モック）
                  </label>
                  <input
                    type="text"
                    value="12/25"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVC（モック）
                  </label>
                  <input
                    type="text"
                    value="123"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* 決済ボタン */}
            <div className="mt-8">
              <button
                onClick={handleMockPayment}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    決済処理中...
                  </span>
                ) : (
                  '支払いを確定してサービスを開始'
                )}
              </button>

              {/* キャンセルリンク */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/onboarding/select-plan')}
                  disabled={isProcessing}
                  className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  プラン選択に戻る
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>
            支払いを確定することで、
            <a href="#" className="text-blue-600 hover:text-blue-700">
              利用規約
            </a>
            と
            <a href="#" className="text-blue-600 hover:text-blue-700">
              プライバシーポリシー
            </a>
            に同意したことになります。
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}
