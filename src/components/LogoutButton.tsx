// ログアウトボタンコンポーネント
'use client'

import { useState } from 'react'
import { signOut } from '@/app/actions/auth'
import { redirectAfterLogout } from '@/app/actions/logout-redirect'

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // ログアウト処理
      const result = await signOut()
      if (result?.success) {
        // ログアウト成功後、適切なページにリダイレクト
        await redirectAfterLogout()
      } else {
        console.error('Logout failed:', result?.error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="hidden sm:inline">
        {isLoading ? 'ログアウト中...' : 'ログアウト'}
      </span>
    </button>
  )
}
