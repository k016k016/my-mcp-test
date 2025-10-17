// メンバーアクションコンポーネント（ロール変更・削除）
'use client'

import { updateMemberRole, removeMember } from '@/app/actions/members'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationRole } from '@/types/database'

interface MemberActionsProps {
  memberId: string
  organizationId: string
  currentRole: OrganizationRole
  isCurrentUser: boolean
  isOwner: boolean
}

export default function MemberActions({
  memberId,
  organizationId,
  currentRole,
  isCurrentUser,
  isOwner,
}: MemberActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleRoleChange = async (newRole: OrganizationRole) => {
    if (newRole === currentRole) return

    setIsLoading(true)
    const result = await updateMemberRole(organizationId, memberId, newRole)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    const result = await removeMember(organizationId, memberId)

    if (result.error) {
      alert(result.error)
      setIsLoading(false)
    } else {
      setShowDeleteConfirm(false)
      router.refresh()
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* ロール変更ドロップダウン（管理者とユーザーのみ選択可能） */}
      {!isOwner && (
        <select
          value={currentRole}
          onChange={(e) => handleRoleChange(e.target.value as OrganizationRole)}
          disabled={isLoading}
          className="text-gray-900 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="member">ユーザー</option>
          <option value="admin">管理者</option>
        </select>
      )}

      {/* 削除ボタン */}
      {!isOwner && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isLoading}
          // className="text-sm bg-red-800 text-red-100 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
          className="
            ml-2
            rounded-md       // 角を丸くする
            bg-red-600       // 少し明るい赤に変更
            px-2 py-1        // 内側の余白（padding）を追加
            text-sm font-semibold text-white // テキストを白＆少し太字に
            shadow-sm        // わずかな影を追加
            hover:bg-red-500 // ホバー時にもう少し明るく
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 // アクセシビリティ対応
            transition-colors  // 色の変化を滑らかに
            disabled:opacity-50 // disabled時のスタイルは維持
            disabled:pointer-events-none // disabled時はクリックイベントを無効に
          "
        >
          削除
        </button>
      )}

      {isOwner && (
        <span className="text-sm text-gray-600">-</span>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">メンバーを削除</h3>
            <p className="text-gray-600 mb-6">
              {isCurrentUser
                ? 'この組織から退出しますか？この操作は取り消せません。'
                : 'このメンバーを削除しますか？この操作は取り消せません。'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
