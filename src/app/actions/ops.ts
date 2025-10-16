// OPS専用のServer Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { isOpsUser } from '@/lib/auth/permissions'

/**
 * OPS権限チェック
 */
async function requireOpsAccess() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です', user: null, supabase }
  }

  const hasOpsAccess = await isOpsUser(user)
  if (!hasOpsAccess) {
    return { error: '運用担当者権限が必要です', user: null, supabase }
  }

  return { user, supabase, error: null }
}

/**
 * 全組織一覧を取得（OPS専用）
 */
export async function getAllOrganizations(params?: {
  limit?: number
  offset?: number
  search?: string
}) {
  try {
    const { user, supabase, error } = await requireOpsAccess()
    if (error || !user) {
      return { error }
    }

    const limit = params?.limit || 50
    const offset = params?.offset || 0
    const search = params?.search

    let query = supabase
      .from('organizations')
      .select(`
        *,
        members:organization_members(count)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data: organizations, error: queryError, count } = await query

    if (queryError) {
      console.error('[getAllOrganizations] Failed to fetch organizations:', queryError)
      return { error: '組織の取得に失敗しました' }
    }

    return {
      success: true,
      organizations,
      total: count || 0,
      limit,
      offset,
    }
  } catch (error) {
    console.error('[getAllOrganizations] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}

/**
 * 組織詳細を取得（OPS専用）
 */
export async function getOrganizationDetails(organizationId: string) {
  try {
    const { user, supabase, error } = await requireOpsAccess()
    if (error || !user) {
      return { error }
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        members:organization_members(
          id,
          role,
          joined_at,
          user:profiles(
            id,
            email,
            name,
            company_name
          )
        )
      `)
      .eq('id', organizationId)
      .single()

    if (orgError) {
      console.error('[getOrganizationDetails] Failed to fetch organization:', orgError)
      return { error: '組織の取得に失敗しました' }
    }

    return {
      success: true,
      organization,
    }
  } catch (error) {
    console.error('[getOrganizationDetails] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}

/**
 * 全ユーザー一覧を取得（OPS専用）
 */
export async function getAllUsers(params?: {
  limit?: number
  offset?: number
  search?: string
}) {
  try {
    const { user, supabase, error } = await requireOpsAccess()
    if (error || !user) {
      return { error }
    }

    const limit = params?.limit || 50
    const offset = params?.offset || 0
    const search = params?.search

    let query = supabase
      .from('profiles')
      .select(`
        *,
        memberships:organization_members(
          role,
          organization:organizations(
            id,
            name,
            slug
          )
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data: users, error: queryError, count } = await query

    if (queryError) {
      console.error('[getAllUsers] Failed to fetch users:', queryError)
      return { error: 'ユーザーの取得に失敗しました' }
    }

    return {
      success: true,
      users,
      total: count || 0,
      limit,
      offset,
    }
  } catch (error) {
    console.error('[getAllUsers] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}

/**
 * ユーザー詳細を取得（OPS専用）
 */
export async function getUserDetails(userId: string) {
  try {
    const { user, supabase, error } = await requireOpsAccess()
    if (error || !user) {
      return { error }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        memberships:organization_members(
          id,
          role,
          joined_at,
          organization:organizations(
            id,
            name,
            slug,
            subscription_plan
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[getUserDetails] Failed to fetch user:', profileError)
      return { error: 'ユーザーの取得に失敗しました' }
    }

    return {
      success: true,
      user: profile,
    }
  } catch (error) {
    console.error('[getUserDetails] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}

/**
 * 監査ログを取得（OPS専用）
 */
export async function getAuditLogs(params?: {
  limit?: number
  offset?: number
  organizationId?: string
  userId?: string
  action?: string
}) {
  try {
    const { user, supabase, error } = await requireOpsAccess()
    if (error || !user) {
      return { error }
    }

    const limit = params?.limit || 100
    const offset = params?.offset || 0

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(id, email, name),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (params?.organizationId) {
      query = query.eq('organization_id', params.organizationId)
    }

    if (params?.userId) {
      query = query.eq('user_id', params.userId)
    }

    if (params?.action) {
      query = query.eq('action', params.action)
    }

    const { data: logs, error: queryError, count } = await query

    if (queryError) {
      console.error('[getAuditLogs] Failed to fetch logs:', queryError)
      return { error: '監査ログの取得に失敗しました' }
    }

    return {
      success: true,
      logs,
      total: count || 0,
      limit,
      offset,
    }
  } catch (error) {
    console.error('[getAuditLogs] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}

/**
 * システム統計情報を取得（OPS専用）
 */
export async function getSystemStats() {
  try {
    const { user, supabase, error } = await requireOpsAccess()
    if (error || !user) {
      return { error }
    }

    // 組織数
    const { count: organizationCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    // ユーザー数
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // アクティブなサブスクリプション数
    const { count: activeSubscriptions } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')

    // 今日の監査ログ数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayAuditLogs } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    return {
      success: true,
      stats: {
        organizations: organizationCount || 0,
        users: userCount || 0,
        activeSubscriptions: activeSubscriptions || 0,
        todayAuditLogs: todayAuditLogs || 0,
      },
    }
  } catch (error) {
    console.error('[getSystemStats] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}
