// メンバー管理ページ（APPドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import MemberList from '@/components/MemberList'
import InviteMemberForm from '@/components/InviteMemberForm'

export default async function MembersPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login`)
  }

  // 現在の組織を取得
  const currentOrgId = await getCurrentOrganizationId()

  if (!currentOrgId) {
    redirect('/onboarding/create-organization')
  }

  // 現在のユーザーのロールを取得
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', currentOrgId)
    .eq('user_id', user.id)
    .single()

  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  // メンバー一覧を取得
  const { data: members } = await supabase
    .from('organization_members')
    .select(
      `
      id,
      role,
      created_at,
      user_id,
      profile:profiles (
        email,
        full_name,
        avatar_url
      )
    `
    )
    .eq('organization_id', currentOrgId)
    .order('created_at', { ascending: false })

  // 保留中の招待を取得
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, role, created_at, expires_at')
    .eq('organization_id', currentOrgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">メンバー管理</h1>
        <p className="text-gray-600 mt-2">組織のメンバーを管理します</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メンバー招待フォーム */}
        <div className="lg:col-span-1">
          {isAdmin ? (
            <InviteMemberForm organizationId={currentOrgId} />
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">メンバーを招待</h2>
              <p className="text-sm text-gray-600">
                管理者のみがメンバーを招待できます
              </p>
            </div>
          )}
        </div>

        {/* メンバー一覧 */}
        <div className="lg:col-span-2">
          <MemberList
            members={members || []}
            invitations={invitations || []}
            currentUserId={user.id}
            currentUserRole={currentMember?.role || 'member'}
            organizationId={currentOrgId}
          />
        </div>
      </div>
    </div>
  )
}
