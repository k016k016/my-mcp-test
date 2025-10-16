// WWWドメイン用レイアウト（マーケティングサイト）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Example - マーケティングサイト',
  description: 'Exampleの公式サイト。企業向けSaaSプラットフォームをご紹介します。',
}

export default async function WwwLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') || ''
  const isOnboarding = pathname.includes('/onboarding')

  // オンボーディングページの場合は認証チェックを行う
  if (isOnboarding) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // オンボーディングページはシンプルなレイアウト
    return <div className="min-h-screen bg-gray-100">{children}</div>
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

  return (
    <div className="min-h-screen bg-gray-600">
      {/* ヘッダー */}
      {/* <header className="border-b">
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
              <a href={appUrl} className="hover:underline">
                ログイン
              </a>
            </div>
          </div>
        </nav>
      </header> */}

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
