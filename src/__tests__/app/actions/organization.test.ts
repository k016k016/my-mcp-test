// 組織管理Server Actionsのテスト
import { describe, it, expect, beforeEach, vi } from 'vitest'

// UUID v4形式のテストデータ（有効なUUID形式）
const TEST_ORG_ID = '00000000-0000-4000-8000-000000000001'
const TEST_USER_ID = '00000000-0000-4000-8000-000000000002'

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

// Next.jsモックを設定
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`REDIRECT: ${url}`) as Error & { digest: string }
    error.digest = `NEXT_REDIRECT;${url}`
    throw error
  }),
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

// 組織コンテキストモックを設定
vi.mock('@/lib/organization/current', () => ({
  getCurrentOrganizationId: vi.fn(),
  setCurrentOrganizationId: vi.fn(),
}))

import {
  createOrganization,
  updateOrganization,
  getUserOrganizations,
  deleteOrganization,
  switchOrganization,
} from '@/app/actions/organization'

describe('Organization Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // デフォルトで認証されたユーザーを返す
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@example.com' } },
      error: null,
    })
  })

  describe('createOrganization', () => {
    it('有効なデータで組織を作成できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            // 組織作成用
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: TEST_ORG_ID,
                    name: 'Test Org',
                    subscription_plan: 'free',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'organization_members') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await createOrganization({
        name: 'Test Org',
      })

      expect(result.success).toBe(true)
      expect(result.organization).toBeDefined()
      expect(result.organization?.name).toBe('Test Org')
    })

    it('未認証ユーザーを拒否する', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await createOrganization({
        name: 'Test Org',
      })

      expect(result.error).toBe('認証が必要です')
    })

    it('監査ログにIP/User-Agentを記録する', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            // 組織作成用
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: TEST_ORG_ID,
                    name: 'Test Org',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'organization_members') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: mockAuditInsert,
          }
        }
        return {}
      })

      await createOrganization({
        name: 'Test Org',
      })

      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'organization.created',
          ip_address: '192.168.1.1',
          user_agent: 'Test Agent',
        })
      )
    })
  })

  describe('updateOrganization', () => {
    it('オーナーが組織情報を更新できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        }
        if (table === 'organizations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: TEST_ORG_ID,
                      name: 'Updated Org',
                    },
                    error: null,
                  }),
                }),
              }),
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

      const result = await updateOrganization(TEST_ORG_ID, {
        name: 'Updated Org',
      })

      expect(result.success).toBe(true)
      expect(result.organization?.name).toBe('Updated Org')
    })

    it('管理者が組織情報を更新できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        }
        if (table === 'organizations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: TEST_ORG_ID, name: 'Updated Org' },
                    error: null,
                  }),
                }),
              }),
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

      const result = await updateOrganization(TEST_ORG_ID, {
        name: 'Updated Org',
      })

      expect(result.success).toBe(true)
    })

    it('一般メンバーの更新を拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'member' },
          error: null,
        }),
      })

      const result = await updateOrganization(TEST_ORG_ID, {
        name: 'Updated Org',
      })

      expect(result.error).toBe('権限がありません')
    })

    it('無効なUUIDを拒否する', async () => {
      const result = await updateOrganization('invalid-uuid', {
        name: 'Updated Org',
      })

      expect(result.error).toBeTruthy()
    })
  })

  describe('getUserOrganizations', () => {
    it('ユーザーの組織一覧を取得できる', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'owner',
              organization: {
                id: 'org-1',
                name: 'Org 1',
              },
            },
            {
              role: 'member',
              organization: {
                id: 'org-2',
                name: 'Org 2',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getUserOrganizations()

      expect(result.success).toBe(true)
      expect(result.organizations).toHaveLength(2)
      expect(result.organizations?.[0].organization.name).toBe('Org 1')
    })

    it('未認証ユーザーを拒否する', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await getUserOrganizations()

      expect(result.error).toBe('認証が必要です')
    })
  })

  describe('deleteOrganization', () => {
    it('オーナーが組織を削除できる', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        }
        if (table === 'organizations') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      })

      await expect(deleteOrganization(TEST_ORG_ID)).rejects.toThrow('REDIRECT: /')
    })

    it('オーナー以外の削除を拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      })

      const result = await deleteOrganization(TEST_ORG_ID)

      expect(result?.error).toBe('オーナーのみが組織を削除できます')
    })
  })

  describe('switchOrganization', () => {
    it('メンバーが所属する組織に切り替えられる', async () => {
      const mockSetCurrentOrganizationId = vi.fn()
      vi.mocked(
        await import('@/lib/organization/current')
      ).setCurrentOrganizationId = mockSetCurrentOrganizationId

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'member-123' },
          error: null,
        }),
      })

      const result = await switchOrganization(TEST_ORG_ID)

      expect(result.success).toBe(true)
      expect(mockSetCurrentOrganizationId).toHaveBeenCalledWith(TEST_ORG_ID)
    })

    it('非メンバーの組織への切り替えを拒否する', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await switchOrganization(TEST_ORG_ID)

      expect(result.error).toBe('この組織にアクセスする権限がありません')
    })
  })
})
