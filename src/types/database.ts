// データベース型定義
// Supabaseのテーブル構造に対応

// ============================================================================
// ENUM型
// ============================================================================

export type OrganizationRole = 'owner' | 'admin' | 'member'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

// B2B企業向けプランタイプ（organization_licensesで使用）
export type LicensePlanType = 'starter' | 'business' | 'pro' | 'enterprise'

export type InvitationStatus = 'pending' | 'accepted' | 'expired'

// ============================================================================
// テーブル型
// ============================================================================

export interface Organization {
  id: string
  name: string
  slug: string

  // サブスクリプション情報
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  subscription_ends_at: string | null

  // Chargebee関連
  chargebee_customer_id: string | null
  chargebee_subscription_id: string | null

  // メタデータ
  metadata: Record<string, any>

  // タイムスタンプ
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null

  // B2B企業向けフィールド
  company_name: string | null // 会社名
  name: string | null // 担当者名（サインアップ時に入力）

  // メタデータ
  metadata: Record<string, any>

  // タイムスタンプ
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole

  // タイムスタンプ
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: OrganizationRole
  status: InvitationStatus
  token: string
  invited_by: string

  expires_at: string
  accepted_at: string | null

  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string | null

  action: string
  resource_type: string
  resource_id: string | null

  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null

  created_at: string
}

export interface UsageLimit {
  id: string
  plan: SubscriptionPlan

  // 制限値
  max_members: number
  max_projects: number
  max_storage_gb: number
  max_api_calls_per_month: number

  features: Record<string, any>

  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  organization_id: string

  // 期間
  period_start: string
  period_end: string

  // 使用量
  members_count: number
  projects_count: number
  storage_used_gb: number
  api_calls_count: number

  created_at: string
  updated_at: string
}

export interface OrganizationLicense {
  id: string
  organization_id: string

  // プラン情報
  plan_type: LicensePlanType
  total_seats: number
  used_seats: number

  // 決済プロバイダー情報
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  chargebee_customer_id: string | null
  chargebee_subscription_id: string | null

  // 契約期間
  contract_start: string
  contract_end: string | null

  // ステータス
  is_active: boolean

  // タイムスタンプ
  created_at: string
  updated_at: string
}

// ============================================================================
// JOIN型（関連データを含む）
// ============================================================================

export interface OrganizationWithMembers extends Organization {
  members: (OrganizationMember & { profile: Profile })[]
}

export interface OrganizationMemberWithProfile extends OrganizationMember {
  profile: Profile
}

export interface OrganizationMemberWithOrganization extends OrganizationMember {
  organization: Organization
}

export interface InvitationWithOrganization extends Invitation {
  organization: Organization
}

// ============================================================================
// リクエスト/レスポンス型
// ============================================================================

export interface CreateOrganizationInput {
  name: string
  slug: string
}

export interface UpdateOrganizationInput {
  name?: string
  slug?: string
  metadata?: Record<string, any>
}

export interface CreateInvitationInput {
  organization_id: string
  email: string
  role: OrganizationRole
}

export interface AcceptInvitationInput {
  token: string
}

export interface UpdateMemberRoleInput {
  member_id: string
  role: OrganizationRole
}

// ============================================================================
// ヘルパー型
// ============================================================================

export interface PlanFeatures {
  analytics: boolean
  api_access: boolean
  priority_support: boolean
  custom_domain?: boolean
}

export interface OrganizationUsage {
  members: number
  projects: number
  storage_gb: number
  api_calls: number
}

export interface OrganizationLimits {
  max_members: number
  max_projects: number
  max_storage_gb: number
  max_api_calls_per_month: number
}

export interface OrganizationWithUsage extends Organization {
  usage: OrganizationUsage
  limits: OrganizationLimits
  features: PlanFeatures
}
