// OPSドメイン用レイアウト（運用画面）
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Operations - Example',
  description: '運用画面',
}

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-800 border-b border-gray-700">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">Operations Center</div>
            <div className="space-x-4">
              <a href="/" className="hover:text-blue-400">
                ダッシュボード
              </a>
              <a href="/monitoring" className="hover:text-blue-400">
                監視
              </a>
              <a href="/deployments" className="hover:text-blue-400">
                デプロイ
              </a>
              <a href="/logs" className="hover:text-blue-400">
                ログ
              </a>
              <button className="text-red-400 hover:text-red-300">
                ログアウト
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
