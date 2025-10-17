// ライセンス管理ヘルパー関数
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import type { OrganizationLicense, LicensePlanType } from '@/types/database'

/**
 * 組織のライセンス情報を取得
 */
export async function getOrganizationLicense(
  organizationId: string
): Promise<OrganizationLicense | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_licenses')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    console.error('[getOrganizationLicense] Error:', error)
    return null
  }

  return data
}

/**
 * ライセンスに空きがあるかチェック
 */
export async function hasAvailableSeats(organizationId: string): Promise<boolean> {
  const license = await getOrganizationLicense(organizationId)

  if (!license) {
    return false
  }

  return license.used_seats < license.total_seats
}

/**
 * 利用可能なシート数を取得
 */
export async function getAvailableSeats(organizationId: string): Promise<number> {
  const license = await getOrganizationLicense(organizationId)

  if (!license) {
    return 0
  }

  return Math.max(0, license.total_seats - license.used_seats)
}

/**
 * ライセンスが有効かチェック
 */
export async function isLicenseActive(organizationId: string): Promise<boolean> {
  const license = await getOrganizationLicense(organizationId)

  if (!license) {
    return false
  }

  // ライセンスが無効
  if (!license.is_active) {
    return false
  }

  // 契約終了日が設定されている場合、期限切れかチェック
  if (license.contract_end) {
    const endDate = new Date(license.contract_end)
    const now = new Date()
    if (now > endDate) {
      return false
    }
  }

  return true
}

/**
 * ライセンスを作成（モック用）
 * 実際の実装では、決済プロバイダーのWebhookから呼び出される
 */
export async function createMockLicense(
  organizationId: string,
  planType: LicensePlanType
): Promise<OrganizationLicense | null> {
  // サービスロールクライアントを使用（RLSをバイパス）
  const supabase = getAdminClient()

  // プランに応じたシート数を決定
  let totalSeats = 3
  switch (planType) {
    case 'starter':
      totalSeats = 3
      break
    case 'business':
      totalSeats = 5
      break
    case 'pro':
      totalSeats = 10
      break
    case 'enterprise':
      totalSeats = 50 // エンタープライズは大きめに
      break
  }

  // サービスロールクライアントを使用してライセンスを作成
  // （通常のユーザーではINSERT権限がないため）
  const { data, error } = await supabase
    .from('organization_licenses')
    .insert({
      organization_id: organizationId,
      plan_type: planType,
      total_seats: totalSeats,
      used_seats: 0,
      is_active: true,
      contract_start: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createMockLicense] Error:', error)
    return null
  }

  return data
}

/**
 * ライセンス使用状況のサマリーを取得
 */
export interface LicenseUsageSummary {
  planType: LicensePlanType
  totalSeats: number
  usedSeats: number
  availableSeats: number
  usagePercentage: number
  isActive: boolean
  contractStart: string
  contractEnd: string | null
}

export async function getLicenseUsageSummary(
  organizationId: string
): Promise<LicenseUsageSummary | null> {
  const license = await getOrganizationLicense(organizationId)

  if (!license) {
    return null
  }

  const availableSeats = Math.max(0, license.total_seats - license.used_seats)
  const usagePercentage =
    license.total_seats > 0 ? (license.used_seats / license.total_seats) * 100 : 0

  return {
    planType: license.plan_type,
    totalSeats: license.total_seats,
    usedSeats: license.used_seats,
    availableSeats,
    usagePercentage,
    isActive: license.is_active,
    contractStart: license.contract_start,
    contractEnd: license.contract_end,
  }
}
