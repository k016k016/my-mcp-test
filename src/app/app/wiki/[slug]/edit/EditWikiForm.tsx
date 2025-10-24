'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateWikiPage } from '@/app/actions/wiki'
import type { WikiPage } from '@/types/database'

interface Props {
  page: WikiPage
}

export default function EditWikiForm({ page }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(page.title)
  const [content, setContent] = useState(page.content)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await updateWikiPage(page.id, { title, content })

      if ('error' in result) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      // 成功したらページ詳細に戻る
      if (result.success) {
        router.refresh()
        router.push(`/wiki/${page.slug}`)
      }
    } catch (err) {
      setError(`ページの更新に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ページを編集</h1>
        <Link href={`/wiki/${page.slug}`} className="text-blue-600 hover:underline">
          キャンセル
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
            onChange={(e) => setTitle(e.target.value)}
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
            value={page.slug}
            disabled
            className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
          <p className="mt-1 text-sm text-gray-500">
            スラッグは変更できません
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
            {isSubmitting ? '更新中...' : '更新'}
          </button>
          <Link
            href={`/wiki/${page.slug}`}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </>
  )
}
