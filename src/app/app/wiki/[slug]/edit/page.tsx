import { notFound } from 'next/navigation'
import { getWikiPage } from '@/app/actions/wiki'
import EditWikiForm from './EditWikiForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditWikiPage({ params }: Props) {
  const { slug } = await params
  const result = await getWikiPage(slug)

  if ('error' in result) {
    notFound()
  }

  const page = result.page

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <EditWikiForm page={page} />
      </div>
    </div>
  )
}
