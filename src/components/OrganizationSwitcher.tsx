// 組織切り替えコンポーネント
'use client'

import { switchOrganization } from '@/app/actions/organization'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
  currentOrganizationId: string
  'data-testid'?: string
}

export default function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
  'data-testid': testId,
}: OrganizationSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uiBusy, setUiBusy] = useState(false) // E2E用のビジー状態

  const currentOrg = organizations.find((org) => org.id === currentOrganizationId)

  async function handleSwitch(organizationId: string) {
    if (organizationId === currentOrganizationId) {
      setIsOpen(false)
      return
    }

    // E2E環境での人工遅延（テスト用）
    // UIビジー状態をONにしてからServer Action実行
    let e2eDelayMs = 0
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const cookieMatch = document.cookie.match(
        /__E2E_FORCE_PENDING_MS__=(\d+)/
      )
      if (cookieMatch) {
        e2eDelayMs = Number(cookieMatch[1])
        console.log('[E2E] forced delay', e2eDelayMs, 'ms')
        setUiBusy(true) // UIビジー状態ON
        await new Promise((r) => setTimeout(r, e2eDelayMs))
        // Cookie削除（1回使い切り）
        document.cookie =
          '__E2E_FORCE_PENDING_MS__=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.local.test'
      }
    }

    const result = await switchOrganization(organizationId)

    if (result.error) {
      setUiBusy(false)
      alert(result.error)
    } else if (result.success && result.redirectUrl) {
      // 最小表示時間300msを保証してから遷移
      if (e2eDelayMs > 0) {
        await new Promise((r) => setTimeout(r, 300))
      }
      setUiBusy(false)
      // クロスドメインリダイレクトのため、window.location.hrefを使用
      window.location.href = result.redirectUrl
    } else {
      // フォールバック: 現在のページを再読み込み
      setUiBusy(false)
      startTransition(() => {
        router.refresh()
        setIsOpen(false)
      })
    }
  }

  return (
    <div className="relative" data-testid={testId}>
      {/* ローディングインジケーター（isPending OR uiBusy） */}
      {(isPending || uiBusy) && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-md z-30"
          data-testid="loading-indicator"
        >
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* 現在の組織表示ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={isPending || uiBusy}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
            {currentOrg?.name.charAt(0).toUpperCase()}
          </div>
          <span data-testid="current-organization-name">{currentOrg?.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* 背景オーバーレイ */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* メニュー本体 */}
          <div
            className="absolute right-0 z-20 w-64 mt-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
            data-testid="organization-menu"
          >
            <div className="py-1">
              {/* 組織一覧 */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                組織を切り替え
              </div>
              {organizations.map((org, index) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    org.id === currentOrganizationId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                  data-testid={org.id === currentOrganizationId ? 'org-option-active' : `org-option-${org.id}`}
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold ${
                      org.id === currentOrganizationId ? 'bg-blue-600' : 'bg-gray-500'
                    }`}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-500">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          org.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : org.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        data-testid="role-badge"
                      >
                        {org.role === 'owner' ? '👑 オーナー' : org.role === 'admin' ? '管理者' : 'メンバー'}
                      </span>
                    </div>
                  </div>
                  {org.id === currentOrganizationId && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}

              {/* 区切り線 */}
              <div className="border-t border-gray-100 my-1" />

              {/* 新しい組織を作成 */}
              <a
                href="/onboarding/create-organization"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                + 新しい組織を作成
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
