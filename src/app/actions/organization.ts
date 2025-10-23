// 組織管理用のServer Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { setCurrentOrganizationId } from '@/lib/organization/current'
import { createMockLicense } from '@/lib/licenses/helpers'
import type { CreateOrganizationInput, UpdateOrganizationInput, LicensePlanType } from '@/types/database'
import {
  validateData,
  validateFormData,
  createOrganizationSchema,
  updateOrganizationSchema,
  uuidSchema,
} from '@/lib/validation'

/**
 * リクエストヘッダーからIP/User-Agentを取得
 */
async function getRequestInfo() {
  const headersList = await headers()
  const ipAddress =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  return { ipAddress, userAgent }
}

/**
 * 組織を作成し、作成者をオーナーとして追加
 * B2B: FormDataを受け取り、planIdがあればライセンスも作成
 */
export async function createOrganization(input: CreateOrganizationInput | FormData) {
  try {
    let validatedData: { name: string }
    let planId: LicensePlanType | null = null

    // FormDataの場合とオブジェクトの場合を判定
    if (input instanceof FormData) {
      const validation = validateFormData(createOrganizationSchema, input)
      if (!validation.success) {
        return { error: validation.error }
      }
      validatedData = validation.data
      planId = input.get('planId') as LicensePlanType | null
    } else {
      const validation = validateData(createOrganizationSchema, input)
      if (!validation.success) {
        return { error: validation.error }
      }
      validatedData = validation.data
    }

    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です' }
    }

    // 組織を作成
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: validatedData.name,
        subscription_plan: 'free',
        subscription_status: 'active',
      })
      .select()
      .single()

    if (orgError || !organization) {
      console.error('[createOrganization] Failed to create organization:', orgError)
      return { error: '組織の作成に失敗しました。もう一度お試しください。' }
    }

    // 作成者をオーナーとして追加
    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      console.error('[createOrganization] Failed to add owner:', memberError)
      // メンバー追加に失敗した場合は組織を削除
      await supabase.from('organizations').delete().eq('id', organization.id)
      return { error: 'メンバーの追加に失敗しました。もう一度お試しください。' }
    }

    // B2B: プランIDがある場合はライセンスを作成（モック）
    if (planId) {
      const license = await createMockLicense(organization.id, planId)
      if (!license) {
        console.error('[createOrganization] Failed to create license')
        // ライセンス作成失敗は警告のみ（組織自体は作成済み）
      }
    }

    // 現在の組織IDを設定
    await setCurrentOrganizationId(organization.id)

    // 監査ログを記録
    const { ipAddress, userAgent } = await getRequestInfo()
    await supabase.from('audit_logs').insert({
      organization_id: organization.id,
      user_id: user.id,
      action: 'organization.created',
      resource_type: 'organization',
      resource_id: organization.id,
      details: { name: organization.name, planId },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    revalidatePath('/', 'layout')
    return { success: true, organization }
  } catch (error) {
    console.error('[createOrganization] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * 組織情報を更新（オーナー・管理者のみ）
 */
export async function updateOrganization(organizationId: string, input: UpdateOrganizationInput) {
  try {
    // 組織IDのバリデーション
    const idValidation = validateData(uuidSchema, organizationId)
    if (!idValidation.success) {
      return { error: idValidation.error }
    }

    // 入力バリデーション
    const validation = validateData(updateOrganizationSchema, input)
    if (!validation.success) {
      return { error: validation.error }
    }

    const validatedData = validation.data

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

    // 組織情報を更新
    const { data: organization, error: updateError } = await supabase
      .from('organizations')
      .update(validatedData)
      .eq('id', organizationId)
      .select()
      .single()

    if (updateError) {
      console.error('[updateOrganization] Failed to update organization:', updateError)
      return { error: '組織の更新に失敗しました。もう一度お試しください。' }
    }

    // 監査ログを記録
    const { ipAddress, userAgent } = await getRequestInfo()
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: 'organization.updated',
      resource_type: 'organization',
      resource_id: organizationId,
      details: validatedData,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    revalidatePath('/', 'layout')
    return { success: true, organization }
  } catch (error) {
    console.error('[updateOrganization] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * ユーザーが所属する組織一覧を取得
 */
export async function getUserOrganizations() {
  try {
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
          subscription_plan,
          subscription_status,
          created_at
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getUserOrganizations] Failed to fetch organizations:', error)
      return { error: '組織の取得に失敗しました。もう一度お試しください。' }
    }

    return { success: true, organizations: memberships }
  } catch (error) {
    console.error('[getUserOrganizations] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * 組織を削除（オーナーのみ）
 */
export async function deleteOrganization(organizationId: string) {
  try {
    // 組織IDのバリデーション
    const idValidation = validateData(uuidSchema, organizationId)
    if (!idValidation.success) {
      return { error: idValidation.error }
    }

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
      console.error('[deleteOrganization] Failed to delete organization:', deleteError)
      return { error: '組織の削除に失敗しました。もう一度お試しください。' }
    }

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error) {
    console.error('[deleteOrganization] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * 組織を切り替え（権限に応じて適切な画面にリダイレクト）
 */
export async function switchOrganization(organizationId: string) {
  try {
    // 組織IDのバリデーション
    const idValidation = validateData(uuidSchema, organizationId)
    if (!idValidation.success) {
      return { error: idValidation.error }
    }

    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です' }
    }

    // ユーザーが組織のメンバーかチェック（ロールも取得）
    const { data: member } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return { error: 'この組織にアクセスする権限がありません' }
    }

    // 現在の組織を設定
    await setCurrentOrganizationId(organizationId)

    // 権限に応じてリダイレクト先を決定
    const isAdmin = member.role === 'owner' || member.role === 'admin'
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

    revalidatePath('/', 'layout')

    const redirectUrl = isAdmin ? adminUrl : appUrl

    // クロスドメインリダイレクトのため、URLを返す
    // クライアント側でwindow.location.hrefを使用してリダイレクト
    return { success: true, redirectUrl }
  } catch (error) {
    console.error('[switchOrganization] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * 決済完了後の処理: ライセンスを作成してADMINドメインにリダイレクト
 */
export async function completePayment(planId: LicensePlanType) {
  try {
    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です' }
    }

    // 現在の組織を取得
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (memberError) {
      console.error('[completePayment] Failed to fetch organization membership:', memberError)
      console.error('[completePayment] User ID:', user.id)
      return { error: '組織が見つかりませんでした。サインアップ時に組織が作成されていない可能性があります。' }
    }

    if (!memberships?.organization_id) {
      console.error('[completePayment] No organization_id in membership data:', memberships)
      return { error: '組織が見つかりませんでした' }
    }

    const orgId = memberships.organization_id
    console.log('[completePayment] Found organization:', orgId)

    // ライセンスを作成
    const license = await createMockLicense(orgId, planId)
    if (!license) {
      return { error: 'ライセンスの作成に失敗しました' }
    }

    // 監査ログを記録
    const { ipAddress, userAgent } = await getRequestInfo()
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      user_id: user.id,
      action: 'license.created',
      resource_type: 'license',
      resource_id: license.id,
      details: { planId, plan_type: license.plan_type },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('[completePayment] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}
