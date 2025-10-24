'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { searchWikiPages } from '@/app/actions/wiki'
import type { WikiSearchResult } from '@/types/database'

function WikiSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<WikiSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初期検索（クエリパラメータがある場合）
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError('検索キーワードを入力してください')
      return
    }

    setIsSearching(true)
    setError(null)
    setSearched(false)

    try {
      const result = await searchWikiPages(searchQuery)

      if ('error' in result) {
        setError(result.error)
        setResults([])
      } else {
        setResults(result.pages || [])
      }
      setSearched(true)
    } catch (err) {
      setError(`検索に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/wiki/search?q=${encodeURIComponent(query)}`)
      handleSearch(query)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Wiki検索</h1>
          <Link href="/wiki" className="text-blue-600 hover:underline">
            Wikiに戻る
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索キーワードを入力"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSearching ? '検索中...' : '検索'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        {searched && !isSearching && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <>
                <p className="text-gray-600 mb-4">
                  検索結果: {results.length}件
                </p>
                <div className="space-y-4">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      href={`/wiki/${result.slug}`}
                      className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h2 className="text-xl font-semibold mb-2">{result.title}</h2>
                      <div className="text-sm text-gray-500">
                        更新:{' '}
                        {new Date(result.updated_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-600">
                <p className="text-lg">検索結果が見つかりませんでした</p>
                <p className="mt-2">別のキーワードで検索してみてください</p>
              </div>
            )}
          </div>
        )}

        {!searched && !isSearching && (
          <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-600">
            <p>検索キーワードを入力して、Wikiページを検索してください</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WikiSearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WikiSearchContent />
    </Suspense>
  )
}
