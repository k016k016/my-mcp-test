// メンバー一覧コンポーネント
'use client'

import { updateMemberRole, removeMember } from '@/app/actions/members'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationRole } from '@/types/database'

interface Member {
  id: string
  role: OrganizationRole
  created_at: string
  user_id: string
  profile: {
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface Invitation {
  id: string
  email: string
  role: OrganizationRole
  created_at: string
  expires_at: string
}

interface MemberListProps {
  members: Member[]
  invitations: Invitation[]
  currentUserId: string
  currentUserRole: OrganizationRole
  organizationId: string
}

export default function MemberList({
  members,
  invitations,
  currentUserId,
  currentUserRole,
  organizationId,
}: MemberListProps) {
  const router = useRouter()
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null)

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'

  async function handleRoleChange(memberId: string, newRole: OrganizationRole) {
    if (!confirm(`このメンバーのロールを${getRoleLabel(newRole)}に変更しますか？`)) {
      return
    }

    setLoadingMemberId(memberId)
    const result = await updateMemberRole(organizationId, memberId, newRole)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setLoadingMemberId(null)
  }

  async function handleRemove(memberId: string, memberEmail: string) {
    if (!confirm(`${memberEmail} を組織から削除しますか？この操作は取り消せません。`)) {
      return
    }

    setLoadingMemberId(memberId)
    const result = await removeMember(organizationId, memberId)

    if (result.error) {
      alert(result.error)
      setLoadingMemberId(null)
    } else {
      router.refresh()
    }
  }

  function getRoleLabel(role: OrganizationRole): string {
    switch (role) {
      case 'owner':
        return 'オーナー'
      case 'admin':
        return '管理者'
      case 'member':
        return 'メンバー'
    }
  }

  function getRoleBadgeColor(role: OrganizationRole): string {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* メンバー一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold">メンバー ({members.length})</h2>
        </div>
        <div className="divide-y">
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId
            const canEdit = isAdmin && !isCurrentUser

            return (
              <div key={member.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-medium">
                    {member.profile.full_name?.charAt(0).toUpperCase() ||
                      member.profile.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {member.profile.full_name || member.profile.email}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-500">(あなた)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{member.profile.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {canEdit ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as OrganizationRole)
                      }
                      disabled={loadingMemberId === member.id}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="member">メンバー</option>
                      <option value="admin">管理者</option>
                      {currentUserRole === 'owner' && <option value="owner">オーナー</option>}
                    </select>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {getRoleLabel(member.role)}
                    </span>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => handleRemove(member.id, member.profile.email)}
                      disabled={loadingMemberId === member.id}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      削除
                    </button>
                  )}

                  {isCurrentUser && currentUserRole !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.id, member.profile.email)}
                      disabled={loadingMemberId === member.id}
                      className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-50"
                    >
                      退出
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 保留中の招待 */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold">保留中の招待 ({invitations.length})</h2>
          </div>
          <div className="divide-y">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-medium">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{invitation.email}</div>
                    <div className="text-sm text-gray-500">
                      招待送信:{' '}
                      {new Date(invitation.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                    invitation.role
                  )}`}
                >
                  {getRoleLabel(invitation.role)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
