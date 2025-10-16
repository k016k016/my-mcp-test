import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isOpsUser,
  hasAdminAccess,
  hasOrganizationAccess,
  getUserPermissionLevel,
  getRedirectUrlForUser,
} from '../permissions'
import { User } from '@supabase/supabase-js'

// Supabaseクライアントのモック
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isOpsUser', () => {
    it('ユーザーがOPS権限を持っている場合、trueを返す', async () => {
      const user = {
        id: 'user-1',
        email: 'ops@example.com',
        user_metadata: { is_ops: true },
      } as User

      const result = await isOpsUser(user)

      expect(result).toBe(true)
    })

    it('ユーザーがOPS権限を持っていない場合、falseを返す', async () => {
      const user = {
        id: 'user-2',
        email: 'user@example.com',
        user_metadata: { is_ops: false },
      } as User

      const result = await isOpsUser(user)

      expect(result).toBe(false)
    })

    it('user_metadataが存在しない場合、falseを返す', async () => {
      const user = {
        id: 'user-3',
        email: 'user@example.com',
      } as User

      const result = await isOpsUser(user)

      expect(result).toBe(false)
    })
  })

  describe('hasAdminAccess', () => {
    it('ユーザーがownerの場合、trueを返す', async () => {
      const user = {
        id: 'user-1',
        email: 'owner@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ role: 'owner' }],
          error: null,
        }),
      })

      const result = await hasAdminAccess(user)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
    })

    it('ユーザーがadminの場合、trueを返す', async () => {
      const user = {
        id: 'user-2',
        email: 'admin@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ role: 'admin' }],
          error: null,
        }),
      })

      const result = await hasAdminAccess(user)

      expect(result).toBe(true)
    })

    it('ユーザーがmemberの場合、falseを返す', async () => {
      const user = {
        id: 'user-3',
        email: 'member@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ role: 'member' }],
          error: null,
        }),
      })

      const result = await hasAdminAccess(user)

      expect(result).toBe(false)
    })

    it('ユーザーが組織に所属していない場合、falseを返す', async () => {
      const user = {
        id: 'user-4',
        email: 'newuser@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await hasAdminAccess(user)

      expect(result).toBe(false)
    })

    it('特定の組織IDに対してadmin権限をチェックできる', async () => {
      const user = {
        id: 'user-5',
        email: 'admin@example.com',
      } as User
      const organizationId = 'org-123'

      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({
          data: [{ role: 'admin' }],
          error: null,
        })
      }

      const mockEq = vi.fn().mockReturnValue(mockEqChain)

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
      })

      const result = await hasAdminAccess(user, organizationId)

      expect(result).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-5')
      expect(mockEqChain.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })
  })

  describe('hasOrganizationAccess', () => {
    it('ユーザーが組織のメンバーの場合、trueを返す', async () => {
      const user = {
        id: 'user-1',
        email: 'member@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'membership-1' }],
          error: null,
        }),
      })

      const result = await hasOrganizationAccess(user)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
    })

    it('ユーザーが組織のメンバーでない場合、falseを返す', async () => {
      const user = {
        id: 'user-2',
        email: 'nonmember@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await hasOrganizationAccess(user)

      expect(result).toBe(false)
    })

    it('特定の組織IDに対してメンバーシップをチェックできる', async () => {
      const user = {
        id: 'user-3',
        email: 'member@example.com',
      } as User
      const organizationId = 'org-456'

      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'membership-2' }],
          error: null,
        })
      }

      const mockEq = vi.fn().mockReturnValue(mockEqChain)

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
      })

      const result = await hasOrganizationAccess(user, organizationId)

      expect(result).toBe(true)
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-3')
      expect(mockEqChain.eq).toHaveBeenCalledWith('organization_id', 'org-456')
    })
  })

  describe('getUserPermissionLevel', () => {
    it('OPS権限を持つユーザーの権限レベルを正しく返す', async () => {
      const user = {
        id: 'user-1',
        email: 'ops@example.com',
        user_metadata: { is_ops: true },
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await getUserPermissionLevel(user)

      expect(result).toEqual({
        isOps: true,
        isAdmin: false,
        isMember: false,
        organizations: [],
      })
    })

    it('管理者権限を持つユーザーの権限レベルを正しく返す', async () => {
      const user = {
        id: 'user-2',
        email: 'admin@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'admin',
              organization: {
                id: 'org-1',
                name: 'Test Org',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getUserPermissionLevel(user)

      expect(result).toEqual({
        isOps: false,
        isAdmin: true,
        isMember: true,
        organizations: [
          {
            id: 'org-1',
            name: 'Test Org',
            role: 'admin',
          },
        ],
      })
    })

    it('一般メンバーの権限レベルを正しく返す', async () => {
      const user = {
        id: 'user-3',
        email: 'member@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'member',
              organization: {
                id: 'org-2',
                name: 'Another Org',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getUserPermissionLevel(user)

      expect(result).toEqual({
        isOps: false,
        isAdmin: false,
        isMember: true,
        organizations: [
          {
            id: 'org-2',
            name: 'Another Org',
            role: 'member',
          },
        ],
      })
    })

    it('組織に所属していないユーザーの権限レベルを正しく返す', async () => {
      const user = {
        id: 'user-4',
        email: 'newuser@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await getUserPermissionLevel(user)

      expect(result).toEqual({
        isOps: false,
        isAdmin: false,
        isMember: false,
        organizations: [],
      })
    })

    it('複数の組織に所属するユーザーの権限レベルを正しく返す', async () => {
      const user = {
        id: 'user-5',
        email: 'multiorg@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'owner',
              organization: {
                id: 'org-1',
                name: 'Org One',
              },
            },
            {
              role: 'member',
              organization: {
                id: 'org-2',
                name: 'Org Two',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getUserPermissionLevel(user)

      expect(result).toEqual({
        isOps: false,
        isAdmin: true, // ownerロールがあるためtrue
        isMember: true,
        organizations: [
          {
            id: 'org-1',
            name: 'Org One',
            role: 'owner',
          },
          {
            id: 'org-2',
            name: 'Org Two',
            role: 'member',
          },
        ],
      })
    })
  })

  describe('getRedirectUrlForUser', () => {
    it('OPS権限を持つユーザーはOPS_URLにリダイレクト', async () => {
      const user = {
        id: 'user-1',
        email: 'ops@example.com',
        user_metadata: { is_ops: true },
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await getRedirectUrlForUser(user)

      expect(result).toBe('http://ops.localhost:3000')
    })

    it('管理者権限を持つユーザーはADMIN_URLにリダイレクト', async () => {
      const user = {
        id: 'user-2',
        email: 'admin@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'admin',
              organization: {
                id: 'org-1',
                name: 'Test Org',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getRedirectUrlForUser(user)

      expect(result).toBe('http://admin.localhost:3000')
    })

    it('一般メンバーはAPP_URLにリダイレクト', async () => {
      const user = {
        id: 'user-3',
        email: 'member@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'member',
              organization: {
                id: 'org-2',
                name: 'Another Org',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getRedirectUrlForUser(user)

      expect(result).toBe('http://app.localhost:3000')
    })

    it('組織に所属していないユーザーはオンボーディングにリダイレクト', async () => {
      const user = {
        id: 'user-4',
        email: 'newuser@example.com',
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await getRedirectUrlForUser(user)

      expect(result).toBe('http://localhost:3000/onboarding')
    })

    it('OPS権限が最優先される（複数の組織に所属していても）', async () => {
      const user = {
        id: 'user-5',
        email: 'ops-admin@example.com',
        user_metadata: { is_ops: true },
      } as User

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              role: 'owner',
              organization: {
                id: 'org-1',
                name: 'Org One',
              },
            },
          ],
          error: null,
        }),
      })

      const result = await getRedirectUrlForUser(user)

      // OPS権限が最優先されるため、OPS_URLにリダイレクト
      expect(result).toBe('http://ops.localhost:3000')
    })
  })
})
