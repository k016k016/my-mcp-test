import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWikiPage } from '@/app/actions/wiki'
import ReactMarkdown from 'react-markdown'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function WikiDetailPage({ params }: Props) {
  const { slug } = await params
  const result = await getWikiPage(slug)

  if ('error' in result) {
    notFound()
  }

  const page = result.page

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/wiki" className="text-blue-600 hover:underline">
            Wikiに戻る
          </Link>
        </div>

        <article className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-4xl font-bold mb-4">{page.title}</h1>

          <div className="flex gap-6 text-sm text-gray-600 mb-8 pb-4 border-b">
            <div>
              作成:{' '}
              {new Date(page.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div>
              更新:{' '}
              {new Date(page.updated_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div>閲覧数: {page.view_count}</div>
          </div>

          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ ...props }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
                ),
                h2: ({ ...props }) => (
                  <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
                ),
                h3: ({ ...props }) => (
                  <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
                ),
                p: ({ ...props }) => <p className="mb-4 leading-7" {...props} />,
                ul: ({ ...props }) => (
                  <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
                ),
                ol: ({ ...props }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
                ),
                li: ({ ...props }) => <li className="ml-4" {...props} />,
                code: ({ className, ...props }) => {
                  const isInline = !className
                  return isInline ? (
                    <code
                      className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block bg-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm"
                      {...props}
                    />
                  )
                },
                pre: ({ ...props }) => <pre className="mb-4" {...props} />,
                blockquote: ({ ...props }) => (
                  <blockquote
                    className="border-l-4 border-gray-300 pl-4 italic my-4"
                    {...props}
                  />
                ),
                a: ({ ...props }) => (
                  <a
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
              }}
            >
              {page.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  )
}
