// メンバー管理ページ（ADMINドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import InviteMemberForm from '@/components/InviteMemberForm'
import MemberActions from '@/components/MemberActions'

export default async function MembersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login`)
  }

  // 現在の組織IDを取得
  const organizationId = await getCurrentOrganizationId()

  if (!organizationId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">メンバー管理</h1>
          <p className="text-red-600 mt-2">組織が選択されていません</p>
        </div>
      </div>
    )
  }

  // 組織のメンバー一覧を取得（削除済みを除外）
  const { data: members } = await supabase
    .from('organization_members')
    .select(
      `
      id,
      role,
      created_at,
      profile:profiles (
        id,
        email,
        full_name,
        name
      )
    `
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 組織情報を取得（サブスクリプションプランも含む）
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, subscription_plan')
    .eq('id', organizationId)
    .single()

  // 現在のプランの上限を取得
  const { data: usageLimit } = await supabase
    .from('usage_limits')
    .select('max_members')
    .eq('plan', organization?.subscription_plan || 'free')
    .single()

  const currentMemberCount = members?.length || 0
  const maxMembers = usageLimit?.max_members || 3

  // ロールの日本語表示
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー'
      case 'admin':
        return '管理者'
      case 'member':
        return 'ユーザー'
      default:
        return role
    }
  }

  // ロールのバッジスタイル
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'member':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">メンバー管理</h1>
        <p className="text-gray-600 mt-2">{organization?.name || '組織'} のメンバーを管理</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メンバー一覧 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                メンバー一覧 ({members?.length || 0})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メール
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ロール
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      参加日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members && members.length > 0 ? (
                    members.map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md mr-3">
                              {(m.profile?.full_name || m.profile?.name || m.profile?.email)
                                ?.charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {m.profile?.full_name || m.profile?.name || '未設定'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{m.profile?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(
                              m.role
                            )}`}
                          >
                            {m.role === 'owner' && <span className="text-sm">👑</span>}
                            {getRoleLabel(m.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(m.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <MemberActions
                            memberId={m.id}
                            organizationId={organizationId}
                            currentRole={m.role}
                            isCurrentUser={m.profile?.id === user.id}
                            isOwner={m.role === 'owner'}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        メンバーがいません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* メンバー招待フォーム */}
        <div className="lg:col-span-1">
          <InviteMemberForm
            organizationId={organizationId}
            currentMemberCount={currentMemberCount}
            maxMembers={maxMembers}
          />
        </div>
      </div>
    </div>
  )
}
