// 組織切り替えコンポーネント
'use client'

import { switchOrganization } from '@/app/actions/organization'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
  currentOrganizationId: string
}

export default function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
}: OrganizationSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentOrg = organizations.find((org) => org.id === currentOrganizationId)

  async function handleSwitch(organizationId: string) {
    if (organizationId === currentOrganizationId) {
      setIsOpen(false)
      return
    }

    const result = await switchOrganization(organizationId)

    if (result.error) {
      alert(result.error)
    } else {
      startTransition(() => {
        router.refresh()
        setIsOpen(false)
      })
    }
  }

  return (
    <div className="relative">
      {/* 現在の組織表示ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={isPending}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
            {currentOrg?.name.charAt(0).toUpperCase()}
          </div>
          <span>{currentOrg?.name}</span>
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
          <div className="absolute right-0 z-20 w-64 mt-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              {/* 組織一覧 */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                組織を切り替え
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    org.id === currentOrganizationId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
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
                    <div className="text-xs text-gray-500">{org.slug}</div>
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
