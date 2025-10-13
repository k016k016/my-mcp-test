// メンバー管理Server Actionsのテスト
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Supabaseモックを設定
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// レート制限モックを設定
const mockRateLimitInvitation = vi.fn()

vi.mock('@/lib/rate-limit', () => ({
  rateLimitInvitation: mockRateLimitInvitation,
}))

// Next.jsモックを設定
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '192.168.1.1'
      if (key === 'user-agent') return 'Test Agent'
      return null
    }),
  })),
}))

import {
  inviteMember,
  updateMemberRole,
  removeMember,
  getOrganizationMembers,
} from '@/app/actions/members'

describe('Members Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // デフォルトで認証されたユーザーを返す
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'admin@example.com' } },
      error: null,
    })

    // デフォルトでレート制限を通過
    mockRateLimitInvitation.mockResolvedValue({
      success: true,
      current: 1,
      limit: 10,
    })
  })

  describe('inviteMember', () => {
    it('オーナーがメンバーを招待できる', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({
              data: { id: 'member-123' },
              error: null,
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: mockAuditInsert,
          }
        }
        return {}
      })

      const result = await inviteMember('org-123', 'newmember@example.com', 'member')

      expect(result.success).toBe(true)
      expect(mockRateLimitInvitation).toHaveBeenCalledWith('org-123')
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'member.invited',
          ip_address: '192.168.1.1',
          user_agent: 'Test Agent',
        })
      )
    })

    it('管理者がメンバーを招待できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'admin' },
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({
              data: { id: 'member-123' },
              error: null,
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await inviteMember('org-123', 'newmember@example.com', 'member')

      expect(result.success).toBe(true)
    })

    it('一般メンバーの招待を拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'member' },
          error: null,
        }),
      })

      const result = await inviteMember('org-123', 'newmember@example.com', 'member')

      expect(result.error).toBe('権限がありません')
    })

    it('無効なメールアドレスを拒否する', async () => {
      const result = await inviteMember('org-123', 'invalid-email', 'member')

      expect(result.error).toBeTruthy()
    })

    it('無効なロールを拒否する', async () => {
      const result = await inviteMember('org-123', 'newmember@example.com', 'invalid-role' as any)

      expect(result.error).toBeTruthy()
    })

    it('レート制限を適用する', async () => {
      mockRateLimitInvitation.mockResolvedValue({
        success: false,
        current: 11,
        limit: 10,
        error: 'レート制限を超えました',
      })

      const result = await inviteMember('org-123', 'newmember@example.com', 'member')

      expect(result.error).toContain('レート制限')
    })

    it('既存メンバーの招待を拒否する', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }).mockResolvedValueOnce({
              data: { id: 'existing-member' },
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await inviteMember('org-123', 'existing@example.com', 'member')

      expect(result.error).toContain('既にメンバーです')
    })
  })

  describe('updateMemberRole', () => {
    it('オーナーがメンバーのロールを変更できる', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'member', user_id: 'target-user' },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: mockAuditInsert,
          }
        }
        return {}
      })

      const result = await updateMemberRole('org-123', 'member-456', 'admin')

      expect(result.success).toBe(true)
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'member.role_updated',
          ip_address: '192.168.1.1',
          user_agent: 'Test Agent',
        })
      )
    })

    it('管理者がメンバーのロールを変更できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'admin' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'member', user_id: 'target-user' },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await updateMemberRole('org-123', 'member-456', 'member')

      expect(result.success).toBe(true)
    })

    it('一般メンバーのロール変更を拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'member' },
          error: null,
        }),
      })

      const result = await updateMemberRole('org-123', 'member-456', 'admin')

      expect(result.error).toBe('権限がありません')
    })

    it('自分自身のロール変更を拒否する', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'owner', user_id: 'user-123' }, // 自分自身
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await updateMemberRole('org-123', 'member-456', 'member')

      expect(result.error).toBe('自分自身のロールは変更できません')
    })

    it('最後のオーナーのロール変更を拒否する', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'owner', user_id: 'other-user' },
              error: null,
            }),
            count: vi.fn().mockResolvedValue({
              count: 1, // 最後のオーナー
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await updateMemberRole('org-123', 'member-456', 'admin')

      expect(result.error).toContain('最後のオーナー')
    })
  })

  describe('removeMember', () => {
    it('オーナーがメンバーを削除できる', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'member', user_id: 'target-user' },
              error: null,
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: mockAuditInsert,
          }
        }
        return {}
      })

      const result = await removeMember('org-123', 'member-456')

      expect(result.success).toBe(true)
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'member.removed',
          ip_address: '192.168.1.1',
          user_agent: 'Test Agent',
        })
      )
    })

    it('管理者がメンバーを削除できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'admin' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'member', user_id: 'target-user' },
              error: null,
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await removeMember('org-123', 'member-456')

      expect(result.success).toBe(true)
    })

    it('一般メンバーの削除を拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'member' },
          error: null,
        }),
      })

      const result = await removeMember('org-123', 'member-456')

      expect(result.error).toBe('権限がありません')
    })

    it('自分自身の削除を拒否する', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'owner' },
              error: null,
            }).mockResolvedValueOnce({
              data: { role: 'owner', user_id: 'user-123' }, // 自分自身
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await removeMember('org-123', 'member-456')

      expect(result.error).toBe('自分自身は削除できません')
    })
  })

  describe('getOrganizationMembers', () => {
    it('組織のメンバー一覧を取得できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'member-1',
                  role: 'owner',
                  user: { id: 'user-1', email: 'owner@example.com' },
                },
                {
                  id: 'member-2',
                  role: 'admin',
                  user: { id: 'user-2', email: 'admin@example.com' },
                },
              ],
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await getOrganizationMembers('org-123')

      expect(result.success).toBe(true)
      expect(result.members).toHaveLength(2)
      expect(result.members?.[0].role).toBe('owner')
    })

    it('未認証ユーザーを拒否する', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await getOrganizationMembers('org-123')

      expect(result.error).toBe('認証が必要です')
    })

    it('非メンバーのアクセスを拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await getOrganizationMembers('org-123')

      expect(result.error).toBe('この組織にアクセスする権限がありません')
    })
  })
})
