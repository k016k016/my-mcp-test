// 組織作成ページ（WWWドメイン - オンボーディング）
'use client'

import { createOrganization } from '@/app/actions/organization'
import { getPlanById } from '@/lib/plans/config'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import type { LicensePlanType } from '@/types/database'

function CreateOrganizationContent() {
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') as LicensePlanType | null

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // プラン情報を取得
  const plan = planId ? getPlanById(planId) : null

  // 会社名をprofilesから取得して自動入力
  useEffect(() => {
    async function loadCompanyName() {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const profile = await response.json()
          if (profile.company_name) {
            handleNameChange(profile.company_name)
          }
        }
      } catch (err) {
        console.error('Failed to load company name:', err)
      }
    }
    loadCompanyName()
  }, [])

  // 組織名からslugを自動生成
  function handleNameChange(value: string) {
    setName(value)
    // 簡易的なslug生成（英数字とハイフンのみ、小文字化）
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
    setSlug(generatedSlug)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // プランIDを含めて組織を作成
    const formData = new FormData()
    formData.append('name', name)
    formData.append('slug', slug)
    if (planId) {
      formData.append('planId', planId)
    }

    const result = await createOrganization(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result.success) {
      // 成功時はAPPドメインへリダイレクト
      window.location.href = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
    } else {
      setError('予期しないエラーが発生しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        {/* ヘッダー */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            組織を作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            チームで使用する組織（ワークスペース）を作成しましょう
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 組織作成フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="例: Acme Corporation"
              />
              <p className="mt-1 text-xs text-gray-500">
                チーム名や会社名など、分かりやすい名前を付けてください
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
                pattern="[a-z0-9\-]+"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                placeholder="例: acme-corp"
              />
              <p className="mt-1 text-xs text-gray-500">
                英小文字、数字、ハイフンのみ使用可能。後から変更できます。
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '作成中...' : '組織を作成'}
            </button>
          </div>
        </form>

        {/* ライセンス情報 */}
        {plan && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">
              ライセンス情報
            </h3>
            <div className="space-y-1 text-sm text-green-800">
              <p>
                <strong>プラン:</strong> {plan.name}
              </p>
              <p>
                <strong>シート数:</strong> {plan.seats}
              </p>
              <p>
                <strong>使用中:</strong> 1/{plan.seats}（あなた）
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreateOrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      }
    >
      <CreateOrganizationContent />
    </Suspense>
  )
}
