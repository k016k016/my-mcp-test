// メンバー招待フォームコンポーネント
'use client'

import { inviteMember } from '@/app/actions/members'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationRole } from '@/types/database'

interface InviteMemberFormProps {
  organizationId: string
  currentMemberCount: number
  maxMembers: number
}

export default function InviteMemberForm({ organizationId, currentMemberCount, maxMembers }: InviteMemberFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSuccessMessage(null)
    setCredentials(null)
    setIsLoading(true)

    const result = await inviteMember(organizationId, email, fullName, role)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setSuccessMessage(result.message || '招待メールを送信しました')
      if (result.credentials) {
        setCredentials(result.credentials)
      }
      setFullName('')
      setEmail('')
      setRole('member')
      setIsLoading(false)
      // 開発環境の場合は自動でリフレッシュしない（パスワードを確認できるように）
      if (!result.credentials) {
        setTimeout(() => {
          setSuccess(false)
          router.refresh()
        }, 2000)
      }
    }
  }

  // 上限チェック（-1は無制限）
  const isAtLimit = maxMembers !== -1 && currentMemberCount >= maxMembers
  const canInvite = !isAtLimit

  return (
    <div className="bg-white text-gray-900 rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">メンバーを招待</h2>

      {/* メンバー数表示 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">現在のメンバー数</span>
          <span className="text-sm font-semibold text-gray-900">
            {currentMemberCount} / {maxMembers === -1 ? '無制限' : maxMembers}
          </span>
        </div>
        {isAtLimit && (
          <p className="mt-2 text-xs text-red-600">
            メンバー数が上限に達しています。プランをアップグレードするか、既存メンバーを削除してください。
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium">{successMessage}</p>
              {credentials && (
                <div className="mt-3 p-3 bg-white rounded border border-green-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">ログイン情報（ローカル環境）</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">メール:</span>
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{credentials.email}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">パスワード:</span>
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{credentials.password}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSuccess(false)
                      setCredentials(null)
                      router.refresh()
                    }}
                    className="mt-3 w-full text-xs bg-green-600 text-white py-1.5 px-3 rounded hover:bg-green-700 transition-colors"
                  >
                    確認しました
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            氏名
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="山田 太郎"
          />
        </div>

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
            <option value="member">ユーザー</option>
            <option value="admin">管理者</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            管理者はオーナーのお金関係以外の操作（メンバーの招待・削除など）ができます
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !canInvite}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '送信中...' : !canInvite ? 'メンバー数が上限です' : '招待を送信'}
        </button>
      </form>
    </div>
  )
}
