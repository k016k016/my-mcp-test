// 招待受諾ページ（APPドメイン）
'use client'

import { acceptInvitation } from '@/app/actions/members'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleAccept() {
    setError(null)
    setIsLoading(true)

    const result = await acceptInvitation(token)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      // 成功時はダッシュボードにリダイレクト
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">組織への招待</h2>
          <p className="mt-2 text-sm text-gray-600">
            組織に参加するには、下のボタンをクリックしてください
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 受諾ボタン */}
        <div className="space-y-4">
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '処理中...' : '招待を受け入れる'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-xs text-yellow-800">
            招待を受け入れると、この組織のメンバーとなり、組織のデータにアクセスできるようになります。
          </p>
        </div>
      </div>
    </div>
  )
}
