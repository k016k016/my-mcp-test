// パスワード更新ページ（WWWドメイン）
// リセットメールのリンクから遷移する
'use client'

import { updatePassword } from '@/app/actions/auth'
import Link from 'next/link'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSubmit(formData: FormData) {
    const password = formData.get('password') as string
    const confirm = formData.get('confirm-password') as string

    // パスワード確認チェック
    if (password !== confirm) {
      setMessage('パスワードが一致しません')
      setIsError(true)
      return
    }

    const result = await updatePassword(formData)

    if (result?.error) {
      setMessage(result.error)
      setIsError(true)
    } else {
      setMessage('パスワードが更新されました。ログインページに移動します...')
      setIsError(false)
      // 成功時は自動的にリダイレクトされる
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            新しいパスワードを設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            新しいパスワードを入力してください（6文字以上）
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

        {/* パスワード更新フォーム */}
        <form className="mt-8 space-y-6" action={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                新しいパスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="新しいパスワード（6文字以上）"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                パスワード確認
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="パスワード確認"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              パスワードを更新
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
