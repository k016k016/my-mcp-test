// WWWドメインのトップページ
export default function WwwPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6">
          Welcome to Example
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          マーケティングサイト（www.example.com）
        </p>
        <div className="space-x-4">
          <a
            href="http://app.localhost:3000"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            アプリを開く
          </a>
          <a
            href="/pricing"
            className="inline-block border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50"
          >
            料金を見る
          </a>
        </div>
      </div>

      {/* 機能紹介 */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-bold mb-3">高速</h3>
          <p className="text-gray-600">
            最新のテクノロジーで高速なパフォーマンスを実現
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-bold mb-3">安全</h3>
          <p className="text-gray-600">
            エンタープライズグレードのセキュリティ
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-bold mb-3">スケーラブル</h3>
          <p className="text-gray-600">
            ビジネスの成長に合わせて拡張可能
          </p>
        </div>
      </div>
    </div>
  )
}
