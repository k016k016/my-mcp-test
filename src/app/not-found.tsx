// グローバル404ページ
export default function NotFound() {
  const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          ページが見つかりません
        </h2>
        <p className="text-gray-600 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="space-x-4">
          <a
            href={wwwUrl}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  )
}
