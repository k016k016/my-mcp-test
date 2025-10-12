// メンバー招待フォームコンポーネント
'use client'

import { inviteMember } from '@/app/actions/members'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationRole } from '@/types/database'

interface InviteMemberFormProps {
  organizationId: string
}

export default function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    const result = await inviteMember(organizationId, email, role)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setEmail('')
      setRole('member')
      setIsLoading(false)
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
      }, 2000)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">メンバーを招待</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">招待メールを送信しました</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            ロール
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrganizationRole)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="member">メンバー</option>
            <option value="admin">管理者</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            管理者はメンバーの招待・削除ができます
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '送信中...' : '招待を送信'}
        </button>
      </form>
    </div>
  )
}
