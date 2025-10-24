// WWWドメイン用レイアウト（マーケティングサイト）
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import AuthPending from '@/components/AuthPending'

export const metadata: Metadata = {
  title: 'Example - マーケティングサイト',
  description: 'Exampleの公式サイト。企業向けSaaSプラットフォームをご紹介します。',
}

// E2E環境ではキャッシュを無効化
export const dynamic = 'force-dynamic'

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
    // E2E環境では擬似認証Cookieをチェック（開発環境のみ）
    if (process.env.NODE_ENV !== 'production') {
      const cookieStore = await cookies()
      const e2eAuth = cookieStore.get('e2e_auth')?.value === '1'
      if (e2eAuth) {
        // E2E擬似認証が有効な場合は認証チェックをスキップ
        return <div className="min-h-screen bg-gray-100">{children}</div>
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // サーバー側でユーザーが取得できない場合、即座にリダイレクトせず
      // クライアント側で再確認させる（サインアップ直後のセッション同期の猶予期間）
      return <AuthPending />
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
