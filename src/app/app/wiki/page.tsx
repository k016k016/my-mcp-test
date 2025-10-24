import Link from 'next/link'
import { getWikiPageList } from '@/app/actions/wiki'

export default async function WikiPage() {
  const result = await getWikiPageList()

  if ('error' in result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Wiki</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {result.error}
        </div>
      </div>
    )
  }

  const pages = result.pages || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Wiki</h1>
        <Link
          href="/wiki/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          新しいページ
        </Link>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">まだページがありません</p>
          <p className="mt-2">新しいページを作成してみましょう</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.slug}`}
              className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2">{page.title}</h3>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>閲覧数: {page.view_count}</span>
                <span>
                  更新: {new Date(page.updated_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
