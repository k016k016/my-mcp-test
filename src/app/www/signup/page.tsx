// サインアップページ（WWWドメイン）
'use client'

import { signUp } from '@/app/actions/auth'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result?.success) {
      // サインアップ成功
      if (result.requiresEmailConfirmation) {
        // メール確認が必要な場合
        router.push('/auth/verify-email')
      } else {
        // メール確認不要の場合はオンボーディングの支払いへ（WWW）
        const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://www.local.test:3000'
        window.location.href = `${wwwUrl}/onboarding/payment`
      }
    } else {
      setError('予期しないエラーが発生しました')
      setIsLoading(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* ロゴ・ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            アカウントを作成
          </h2>
          <p className="mt-3 text-slate-600 text-lg">
            または{' '}
            <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-500 transition-colors">
              ログインする
            </Link>
          </p>
        </div>

        {/* メインカード */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* サインアップフォーム */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="companyName" className="block text-sm font-semibold text-slate-700 mb-2">
                会社名
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                required
                maxLength={100}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="株式会社◯◯"
              />
            </div>
            <div>
              <label htmlFor="contactName" className="block text-sm font-semibold text-slate-700 mb-2">
                担当者名
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="6文字以上"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="もう一度入力"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    サインアップ中...
                  </span>
                ) : (
                  '無料でアカウントを作成'
                )}
              </button>
            </div>
          </form>

          {/* 利用規約 */}
          <p className="mt-6 text-center text-sm text-slate-600">
            サインアップすることで、{' '}
            <Link href="/terms" className="text-purple-600 hover:text-purple-500 font-medium transition-colors">
              利用規約
            </Link>
            {' '}と{' '}
            <Link href="/privacy" className="text-purple-600 hover:text-purple-500 font-medium transition-colors">
              プライバシーポリシー
            </Link>
            {' '}に同意したことになります。
          </p>
        </div>
      </div>
    </div>
  )
}
