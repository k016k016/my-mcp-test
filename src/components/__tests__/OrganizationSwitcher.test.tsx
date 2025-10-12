// OrganizationSwitcherのユニットテスト
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrganizationSwitcher from '../OrganizationSwitcher'

// モックデータ
const mockOrganizations = [
  {
    id: 'org-1',
    name: 'テスト組織1',
    slug: 'test-org-1',
    subscription_plan: 'free',
    subscription_status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'org-2',
    name: 'テスト組織2',
    slug: 'test-org-2',
    subscription_plan: 'pro',
    subscription_status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

describe('OrganizationSwitcher', () => {
  it('現在の組織名を表示する', () => {
    render(
      <OrganizationSwitcher
        organizations={mockOrganizations}
        currentOrganizationId="org-1"
      />
    )

    // 複数の要素がある場合は最初のものを取得
    const orgNames = screen.getAllByText('テスト組織1')
    expect(orgNames.length).toBeGreaterThan(0)
    expect(orgNames[0]).toBeInTheDocument()
  })

  it('ドロップダウンをクリックすると組織一覧が表示される', () => {
    render(
      <OrganizationSwitcher
        organizations={mockOrganizations}
        currentOrganizationId="org-1"
      />
    )

    // ドロップダウンをクリック
    const button = screen.getByRole('button')
    fireEvent.click(button)

    // 両方の組織が表示されることを確認
    expect(screen.getAllByText('テスト組織1').length).toBeGreaterThan(0)
    expect(screen.getByText('テスト組織2')).toBeInTheDocument()
  })

  it('組織が空の場合でもエラーにならない', () => {
    render(
      <OrganizationSwitcher
        organizations={[]}
        currentOrganizationId={null}
      />
    )

    // ボタンが表示されることを確認（空の状態でも動作する）
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('新しい組織を作成リンクが表示される', () => {
    render(
      <OrganizationSwitcher
        organizations={mockOrganizations}
        currentOrganizationId="org-1"
      />
    )

    // ドロップダウンを開く
    const button = screen.getByRole('button')
    fireEvent.click(button)

    // 新しい組織を作成リンクを確認
    expect(screen.getByText('+ 新しい組織を作成')).toBeInTheDocument()
  })
})
