// WWWドメイン用レイアウト（マーケティングサイト）
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Welcome - Example',
  description: 'マーケティングサイト',
}

export default function WwwLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-600">
      {/* ヘッダー */}
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">Example</div>
            <div className="space-x-4">
              <a href="/" className="hover:underline">
                ホーム
              </a>
              <a href="/features" className="hover:underline">
                機能
              </a>
              <a href="/pricing" className="hover:underline">
                料金
              </a>
              <a href="http://app.localhost:3000" className="hover:underline">
                ログイン
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main>{children}</main>

      {/* フッター */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          © 2025 Example. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
