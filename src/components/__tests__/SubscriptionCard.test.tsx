// SubscriptionCardのユニットテスト
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SubscriptionCard from '../SubscriptionCard'

// モックデータ - 実際のコンポーネントの型に合わせる
const mockOrganizationFree = {
  id: 'org-1',
  name: 'テスト組織',
  slug: 'test-org',
  subscription_plan: 'free',
  subscription_status: 'active',
  trial_ends_at: null,
  chargebee_customer_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const mockOrganizationPro = {
  ...mockOrganizationFree,
  subscription_plan: 'pro',
  chargebee_customer_id: 'cust_123',
}

const mockUsageLimitFree = {
  id: 'limit-1',
  organization_id: 'org-1',
  max_members: 3,
  max_projects: 5,
  max_storage_gb: 1,
  max_api_calls_per_month: 10000,
  features: {
    analytics: false,
    api_access: false,
    priority_support: false,
    custom_domain: false,
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const mockUsageLimitPro = {
  ...mockUsageLimitFree,
  max_members: 10,
  max_projects: 50,
  max_storage_gb: 10,
  max_api_calls_per_month: 100000,
  features: {
    analytics: true,
    api_access: true,
    priority_support: true,
    custom_domain: false,
  },
}

const mockCurrentUsage = {
  members: 2,
  projects: 3,
  storage_gb: 0.5,
  api_calls: 5000,
}

describe('SubscriptionCard', () => {
  it('Freeプランの情報を表示する', () => {
    render(
      <SubscriptionCard
        organization={mockOrganizationFree}
        usageLimit={mockUsageLimitFree}
        currentUsage={mockCurrentUsage}
      />
    )

    expect(screen.getByText('無料プラン')).toBeInTheDocument()
    expect(screen.getByText('有効')).toBeInTheDocument()
  })

  it('Proプランの情報を表示する', () => {
    render(
      <SubscriptionCard
        organization={mockOrganizationPro}
        usageLimit={mockUsageLimitPro}
        currentUsage={mockCurrentUsage}
      />
    )

    expect(screen.getByText('Proプラン')).toBeInTheDocument()
    expect(screen.getByText('有効')).toBeInTheDocument()
  })

  it('トライアル中のステータスを表示する', () => {
    const trialingOrg = {
      ...mockOrganizationFree,
      subscription_status: 'trialing',
      trial_ends_at: '2025-01-31T00:00:00Z',
    }

    render(
      <SubscriptionCard
        organization={trialingOrg}
        usageLimit={mockUsageLimitFree}
        currentUsage={mockCurrentUsage}
      />
    )

    expect(screen.getByText('トライアル中')).toBeInTheDocument()
    expect(screen.getByText(/トライアル終了:/)).toBeInTheDocument()
  })

  it('使用量を正しく表示する', () => {
    render(
      <SubscriptionCard
        organization={mockOrganizationFree}
        usageLimit={mockUsageLimitFree}
        currentUsage={mockCurrentUsage}
      />
    )

    // メンバー数: 2 / 3
    expect(screen.getByText(/2.*\/ 3/)).toBeInTheDocument()
    // プロジェクト数: 3 / 5
    expect(screen.getByText(/3.*\/ 5/)).toBeInTheDocument()
  })

  it('Chargebee顧客IDがある場合は請求履歴ボタンを表示する', () => {
    render(
      <SubscriptionCard
        organization={mockOrganizationPro}
        usageLimit={mockUsageLimitPro}
        currentUsage={mockCurrentUsage}
      />
    )

    expect(screen.getByText('請求履歴を見る')).toBeInTheDocument()
  })

  it('読み込み中の場合は適切に表示する', () => {
    render(
      <SubscriptionCard
        organization={null}
        usageLimit={null}
        currentUsage={mockCurrentUsage}
      />
    )

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })
})
