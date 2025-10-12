// MemberListのユニットテスト
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberList from '../MemberList'

// モックデータ - 実際のコンポーネントの型に合わせる
const mockMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    organization_id: 'org-1',
    role: 'owner' as const,
    created_at: '2025-01-01T00:00:00Z',
    profile: {
      email: 'owner@example.com',
      full_name: 'オーナー太郎',
      avatar_url: null,
    },
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    organization_id: 'org-1',
    role: 'admin' as const,
    created_at: '2025-01-02T00:00:00Z',
    profile: {
      email: 'admin@example.com',
      full_name: '管理者次郎',
      avatar_url: null,
    },
  },
  {
    id: 'member-3',
    user_id: 'user-3',
    organization_id: 'org-1',
    role: 'member' as const,
    created_at: '2025-01-03T00:00:00Z',
    profile: {
      email: 'member@example.com',
      full_name: 'メンバー三郎',
      avatar_url: null,
    },
  },
]

const mockInvitations = [
  {
    id: 'invite-1',
    email: 'pending@example.com',
    role: 'member' as const,
    created_at: '2025-01-10T00:00:00Z',
    expires_at: '2025-01-20T00:00:00Z',
  },
]

describe('MemberList', () => {
  it('メンバー一覧を表示する', () => {
    render(
      <MemberList
        members={mockMembers}
        invitations={[]}
        currentUserId="user-1"
        currentUserRole="owner"
        organizationId="org-1"
      />
    )

    expect(screen.getByText('オーナー太郎')).toBeInTheDocument()
    expect(screen.getByText('管理者次郎')).toBeInTheDocument()
    expect(screen.getByText('メンバー三郎')).toBeInTheDocument()
  })

  it('各メンバーのロールを表示する', () => {
    render(
      <MemberList
        members={mockMembers}
        invitations={[]}
        currentUserId="user-1"
        currentUserRole="owner"
        organizationId="org-1"
      />
    )

    // 複数の要素がある場合は getAllByText を使用
    expect(screen.getAllByText('オーナー').length).toBeGreaterThan(0)
    expect(screen.getAllByText('管理者').length).toBeGreaterThan(0)
    expect(screen.getAllByText('メンバー').length).toBeGreaterThan(0)
  })

  it('保留中の招待を表示する', () => {
    render(
      <MemberList
        members={mockMembers}
        invitations={mockInvitations}
        currentUserId="user-1"
        currentUserRole="owner"
        organizationId="org-1"
      />
    )

    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.getByText('保留中の招待 (1)')).toBeInTheDocument()
  })

  it('メンバーカウントを表示する', () => {
    render(
      <MemberList
        members={mockMembers}
        invitations={[]}
        currentUserId="user-1"
        currentUserRole="owner"
        organizationId="org-1"
      />
    )

    expect(screen.getByText('メンバー (3)')).toBeInTheDocument()
  })

  it('メンバーがいない場合も正しく表示する', () => {
    render(
      <MemberList
        members={[]}
        invitations={[]}
        currentUserId="user-1"
        currentUserRole="owner"
        organizationId="org-1"
      />
    )

    expect(screen.getByText('メンバー (0)')).toBeInTheDocument()
  })
})
