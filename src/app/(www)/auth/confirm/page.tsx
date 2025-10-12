// メール確認成功ページ（WWWドメイン）
import Link from 'next/link'

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* 成功アイコン */}
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <svg
              className="h-16 w-16 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* メッセージ */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            メール確認が完了しました
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            アカウントの作成が完了しました。ログインしてご利用ください。
          </p>
        </div>

        {/* ログインボタン */}
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ログインする
          </Link>
        </div>
      </div>
    </div>
  )
}
