// 設定ページ用レイアウト
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-8">
        {/* サイドバーナビゲーション */}
        <nav className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">設定</h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/settings/organization"
                  className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                    pathname === '/settings/organization' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  組織設定
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/members"
                  className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                    pathname === '/settings/members' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  メンバー管理
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/subscription"
                  className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                    pathname === '/settings/subscription' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  サブスクリプション
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/profile"
                  className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                    pathname === '/settings/profile' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  プロフィール
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/notifications"
                  className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                    pathname === '/settings/notifications' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  通知設定
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
