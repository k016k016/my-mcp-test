// B2B企業向けプラン設定
import type { LicensePlanType } from '@/types/database'

export interface PlanConfig {
  id: LicensePlanType
  name: string
  description: string
  price: number // 月額料金（円）
  seats: number // 含まれるシート数
  features: string[] // 機能リスト
  highlighted?: boolean // おすすめプランとしてハイライト表示
}

/**
 * B2B企業向けプラン一覧
 */
export const PLANS: PlanConfig[] = [
  {
    id: 'starter',
    name: 'スタータープラン',
    description: '小規模チーム向け',
    price: 4500,
    seats: 3,
    features: [
      '基本機能の利用',
      'メンバー管理',
      'データ分析（基本）',
      'メールサポート',
    ],
  },
  {
    id: 'business',
    name: 'ビジネスプラン',
    description: '成長中のチーム向け',
    price: 7000,
    seats: 5,
    features: [
      '基本機能の利用',
      'メンバー管理',
      'データ分析（詳細）',
      'API連携',
      '優先サポート',
    ],
    highlighted: true, // おすすめプラン
  },
  {
    id: 'pro',
    name: 'プロプラン',
    description: '大規模チーム向け',
    price: 12000,
    seats: 10,
    features: [
      '基本機能の利用',
      'メンバー管理',
      'データ分析（詳細）',
      'API連携',
      'カスタムレポート',
      '専任サポート',
      'SLA保証',
    ],
  },
]

/**
 * 追加ユーザーの料金（1人あたり/月）
 */
export const ADDITIONAL_USER_PRICE = 1500

/**
 * プランIDからプラン設定を取得
 */
export function getPlanById(id: LicensePlanType): PlanConfig | undefined {
  return PLANS.find((plan) => plan.id === id)
}

/**
 * 料金を日本円フォーマットで返す
 */
export function formatPrice(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`
}
