// ADMINドメイン用レイアウト（管理画面）
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin - Example',
  description: '管理画面',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* サイドバー */}
      <div className="flex">
        <aside className="w-64 bg-gray-900 text-white min-h-screen">
          <div className="p-6">
            <div className="text-xl font-bold mb-8">Admin Panel</div>
            <nav className="space-y-2">
              <a
                href="/"
                className="block px-4 py-2 rounded hover:bg-gray-800"
              >
                ダッシュボード
              </a>
              <a
                href="/users"
                className="block px-4 py-2 rounded hover:bg-gray-800"
              >
                ユーザー管理
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 rounded hover:bg-gray-800"
              >
                システム設定
              </a>
              <a
                href="/logs"
                className="block px-4 py-2 rounded hover:bg-gray-800"
              >
                ログ
              </a>
            </nav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1">
          <header className="bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">管理画面</h1>
              <button className="text-red-600 hover:underline">
                ログアウト
              </button>
            </div>
          </header>
          <main className="p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
