'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createWikiPage } from '@/app/actions/wiki'

export default function CreateWikiPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    console.log('[CreateWikiPage] Submitting:', { title, slug, content: content.substring(0, 50) })

    try {
      const result = await createWikiPage({ title, slug, content })
      console.log('[CreateWikiPage] Result:', result)

      if ('error' in result) {
        console.error('[CreateWikiPage] Error from server:', result.error)
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      // 成功したらページ詳細に遷移（相対URLで現在のドメインを維持）
      if (result.success && result.slug) {
        console.log('[CreateWikiPage] Success, navigating to:', `/wiki/${result.slug}`)
        router.refresh() // キャッシュを無効化
        router.push(`/wiki/${result.slug}`)
      }
    } catch (err) {
      console.error('[CreateWikiPage] Exception:', err)
      setError(`ページの作成に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
      setIsSubmitting(false)
    }
  }

  // タイトルからスラッグを自動生成
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">新しいページを作成</h1>
          <Link href="/wiki" className="text-blue-600 hover:underline">
            Wikiに戻る
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              タイトル
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ページのタイトルを入力"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              スラッグ（URL）
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="page-url-slug"
              pattern="[a-z0-9\-]+"
              title="小文字、数字、ハイフンのみ使用可能"
            />
            <p className="mt-1 text-sm text-gray-500">
              小文字、数字、ハイフンのみ使用可能（例: getting-started）
            </p>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              内容（Markdown）
            </label>
            <textarea
              id="content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={15}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="# 見出し&#10;&#10;本文をMarkdownで記述してください。"
            />
            <p className="mt-1 text-sm text-gray-500">Markdown形式で記述できます</p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '作成中...' : '作成'}
            </button>
            <Link
              href="/wiki"
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
