// メール確認待ち画面（WWWドメイン）
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* メールアイコン */}
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-100 p-4">
            <svg
              className="h-16 w-16 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* メッセージ */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            メールを確認してください
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録したメールアドレスに確認リンクを送信しました。
            <br />
            メール内のリンクをクリックして、アカウントを有効化してください。
          </p>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
        </div>

        {/* ホームに戻る */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
