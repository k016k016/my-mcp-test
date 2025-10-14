// パスワード忘れページ（WWWドメイン）
// リセットメール送信リクエスト
'use client'

import { resetPassword } from '@/app/actions/auth'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleSubmit(formData: FormData) {
    const result = await resetPassword(formData)

    if (result?.error) {
      setMessage(result.error)
      setIsError(true)
    } else if (result?.success) {
      setMessage(result.success)
      setIsError(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            パスワードのリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
          </p>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`rounded-md p-4 ${
              isError
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* リセットリクエストフォーム */}
        <form className="mt-8 space-y-6" action={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="sr-only">
              メールアドレス
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="メールアドレス"
            />
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              リセットメールを送信
            </button>
          </div>
        </form>

        {/* ログインに戻る */}
        <div className="text-center">
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            ログインに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
