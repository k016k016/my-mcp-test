// 権限チェック関数
import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

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
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  
  const { data: memberships } = await query
  
  return memberships && memberships.length > 0
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
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
  
  const organizations = (memberships || []).map((m: any) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role
  }))
  
  // 管理者権限チェック（任意の組織でadmin/owner）
  const isAdmin = organizations.some(org => 
    org.role === 'owner' || org.role === 'admin'
  )
  
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
 */
export async function getRedirectUrlForUser(user: User): Promise<string> {
  const permissions = await getUserPermissionLevel(user)
  
  // 運用担当者はOPS画面へ
  if (permissions.isOps) {
    return process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.localhost:3000'
  }
  
  // 管理者はADMIN画面へ
  if (permissions.isAdmin) {
    return process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'
  }
  
  // 一般メンバーはAPP画面へ
  if (permissions.isMember) {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
  }
  
  // 組織に所属していない場合はオンボーディングへ
  return `${process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'}/onboarding`
}
