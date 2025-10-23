// 権限チェック関数
import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'
import { setCurrentOrganizationId } from '@/lib/organization/current'

/**
 * ユーザーが運用担当者かどうかをチェック
 */
export async function isOpsUser(user: User): Promise<boolean> {
  return user.user_metadata?.is_ops === true
}

/**
 * ユーザーが組織の管理者権限を持っているかチェック
 * @param user ユーザー情報
 * @param organizationId 組織ID（省略時は現在の組織）
 */
export async function hasAdminAccess(user: User, organizationId?: string): Promise<boolean> {
  const supabase = await createClient()
  
  let query = supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .is('deleted_at', null)
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  
  const { data: memberships } = await query
  
  if (!memberships || memberships.length === 0) {
    return false
  }
  
  // ownerまたはadmin権限を持っているかチェック
  return memberships.some(membership => 
    membership.role === 'owner' || membership.role === 'admin'
  )
}

/**
 * ユーザーが組織のメンバーかどうかをチェック
 * @param user ユーザー情報
 * @param organizationId 組織ID（省略時は現在の組織）
 */
export async function hasOrganizationAccess(user: User, organizationId?: string): Promise<boolean> {
  const supabase = await createClient()
  
  let query = supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  
  const { data: memberships } = await query

  return Array.isArray(memberships) && memberships.length > 0
}

/**
 * ユーザーの権限レベルを取得
 */
export async function getUserPermissionLevel(user: User): Promise<{
  isOps: boolean
  isAdmin: boolean
  isMember: boolean
  organizations: Array<{
    id: string
    name: string
    role: string
  }>
}> {
  const supabase = await createClient()
  
  // 運用担当者権限チェック
  const isOps = await isOpsUser(user)
  
  // 組織メンバーシップ取得
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  console.error('[getUserPermissionLevel] User ID:', user.id)
  console.error('[getUserPermissionLevel] Membership query error:', membershipError)
  console.error('[getUserPermissionLevel] Memberships:', memberships)

  const organizations = (memberships || []).map((m: any) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role
  }))

  console.error('[getUserPermissionLevel] Organizations:', organizations)

  // 管理者権限チェック（任意の組織でadmin/owner）
  const isAdmin = organizations.some(org =>
    org.role === 'owner' || org.role === 'admin'
  )

  console.error('[getUserPermissionLevel] isAdmin:', isAdmin)
  
  // メンバー権限チェック
  const isMember = organizations.length > 0
  
  return {
    isOps,
    isAdmin,
    isMember,
    organizations
  }
}

/**
 * 権限に基づくリダイレクト先を決定
 * 注意: このままでは使用できません。ログインアクション内で使用してください。
 */
export async function getRedirectUrlForUser(user: User): Promise<string> {
  const permissions = await getUserPermissionLevel(user)

  console.error('[getRedirectUrlForUser] User ID:', user.id)
  console.error('[getRedirectUrlForUser] Permissions:', permissions)

  // 運用担当者はOPS画面へ
  if (permissions.isOps) {
    const url = process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.localhost:3000'
    console.error('[getRedirectUrlForUser] Redirecting to OPS:', url)
    return url
  }

  // 管理者はADMIN画面へ
  if (permissions.isAdmin) {
    const url = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'
    console.error('[getRedirectUrlForUser] Redirecting to ADMIN:', url)
    return url
  }

  // 一般メンバーはAPP画面へ
  if (permissions.isMember) {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
    console.error('[getRedirectUrlForUser] Redirecting to APP:', url)
    return url
  }

  // 想定外（原則発生しない）: 仕様上、組織未所属ユーザーは存在しない
  // フォールバックとしてWWWトップへ
  const url = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
  console.error('[getRedirectUrlForUser] Redirecting to WWW (fallback):', url)
  return url
}
