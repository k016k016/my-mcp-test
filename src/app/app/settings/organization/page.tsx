// 組織設定ページ（APPドメイン）
'use client'

import { updateOrganization } from '@/app/actions/organization'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // TODO: 現在の組織情報を取得する処理
  // 実際の実装では、Server ComponentでデータをfetchしてClientに渡すか、
  // APIルートを作成してクライアントからfetchする必要があります

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    if (!organizationId) {
      setError('組織IDが取得できません')
      setIsLoading(false)
      return
    }

    const result = await updateOrganization(organizationId, { name, slug })

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      setTimeout(() => {
        router.refresh()
      }, 1000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">組織設定</h1>
        <p className="text-gray-600 mt-2">組織の基本情報を管理します</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* メッセージ表示 */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
            <p className="text-sm text-green-800">設定を保存しました</p>
          </div>
        )}

        {/* 組織設定フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              組織名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="例: Acme Corporation"
            />
            <p className="mt-1 text-xs text-gray-500">
              チーム名や会社名など、分かりやすい名前を設定してください
            </p>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              組織ID（URL用）
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9-]+"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
              placeholder="例: acme-corp"
            />
            <p className="mt-1 text-xs text-gray-500">
              英小文字、数字、ハイフンのみ使用可能。URLに使用されます。
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '保存中...' : '変更を保存'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
          </div>
        </form>

        {/* 危険な操作 */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">危険な操作</h3>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">組織を削除</h4>
            <p className="text-sm text-red-700 mb-4">
              組織を削除すると、全てのデータが完全に削除されます。この操作は取り消せません。
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    '本当に組織を削除しますか？この操作は取り消せません。全てのデータが完全に削除されます。'
                  )
                ) {
                  // TODO: 組織削除の実装
                  alert('組織削除機能は実装予定です')
                }
              }}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              組織を削除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
