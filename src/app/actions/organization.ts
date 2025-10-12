// 組織管理用のServer Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { setCurrentOrganizationId } from '@/lib/organization/current'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@/types/database'

/**
 * 組織を作成し、作成者をオーナーとして追加
 */
export async function createOrganization(input: CreateOrganizationInput) {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です' }
  }

  // slugの重複チェック
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', input.slug)
    .single()

  if (existing) {
    return { error: 'この組織IDは既に使用されています' }
  }

  // 組織を作成
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      slug: input.slug,
      subscription_plan: 'free',
      subscription_status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14日間のトライアル
    })
    .select()
    .single()

  if (orgError || !organization) {
    return { error: '組織の作成に失敗しました: ' + orgError.message }
  }

  // 作成者をオーナーとして追加
  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: organization.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    // メンバー追加に失敗した場合は組織を削除
    await supabase.from('organizations').delete().eq('id', organization.id)
    return { error: 'メンバーの追加に失敗しました: ' + memberError.message }
  }

  // 監査ログを記録
  await supabase.from('audit_logs').insert({
    organization_id: organization.id,
    user_id: user.id,
    action: 'organization.created',
    resource_type: 'organization',
    resource_id: organization.id,
    details: { name: organization.name, slug: organization.slug },
  })

  revalidatePath('/', 'layout')
  return { success: true, organization }
}

/**
 * 組織情報を更新（オーナー・管理者のみ）
 */
export async function updateOrganization(organizationId: string, input: UpdateOrganizationInput) {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です' }
  }

  // 権限チェック（オーナーまたは管理者か）
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: '権限がありません' }
  }

  // slugの重複チェック（slugを変更する場合）
  if (input.slug) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', input.slug)
      .neq('id', organizationId)
      .single()

    if (existing) {
      return { error: 'この組織IDは既に使用されています' }
    }
  }

  // 組織情報を更新
  const { data: organization, error: updateError } = await supabase
    .from('organizations')
    .update(input)
    .eq('id', organizationId)
    .select()
    .single()

  if (updateError) {
    return { error: '組織の更新に失敗しました: ' + updateError.message }
  }

  // 監査ログを記録
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    user_id: user.id,
    action: 'organization.updated',
    resource_type: 'organization',
    resource_id: organizationId,
    details: input,
  })

  revalidatePath('/', 'layout')
  return { success: true, organization }
}

/**
 * ユーザーが所属する組織一覧を取得
 */
export async function getUserOrganizations() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です' }
  }

  // ユーザーが所属する組織を取得（ロール付き）
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select(
      `
      role,
      organization:organizations (
        id,
        name,
        slug,
        subscription_plan,
        subscription_status,
        created_at
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: '組織の取得に失敗しました: ' + error.message }
  }

  return { success: true, organizations: memberships }
}

/**
 * 組織を削除（オーナーのみ）
 */
export async function deleteOrganization(organizationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です' }
  }

  // 権限チェック（オーナーのみ）
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'owner') {
    return { error: 'オーナーのみが組織を削除できます' }
  }

  // 組織を削除（カスケード削除でメンバーなども削除される）
  const { error: deleteError } = await supabase
    .from('organizations')
    .delete()
    .eq('id', organizationId)

  if (deleteError) {
    return { error: '組織の削除に失敗しました: ' + deleteError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * 組織を切り替え
 */
export async function switchOrganization(organizationId: string) {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です' }
  }

  // ユーザーが組織のメンバーかチェック
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return { error: 'この組織にアクセスする権限がありません' }
  }

  // 現在の組織を設定
  await setCurrentOrganizationId(organizationId)

  revalidatePath('/', 'layout')
  return { success: true }
}
