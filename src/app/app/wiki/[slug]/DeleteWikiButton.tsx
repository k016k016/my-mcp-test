'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWikiPage } from '@/app/actions/wiki'

interface Props {
  pageId: string
  pageTitle: string
}

export default function DeleteWikiButton({ pageId, pageTitle }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const confirmed = confirm(`「${pageTitle}」を本当に削除しますか？\n\nこの操作は取り消せません。`)

    if (!confirmed) return

    setIsDeleting(true)

    try {
      const result = await deleteWikiPage(pageId)

      if ('error' in result) {
        alert(`削除に失敗しました: ${result.error}`)
        setIsDeleting(false)
        return
      }

      if (result.success) {
        router.refresh()
        router.push('/wiki')
      }
    } catch (err) {
      alert(`削除に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isDeleting ? '削除中...' : '削除'}
    </button>
  )
}
