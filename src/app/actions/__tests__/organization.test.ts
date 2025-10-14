import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOrganization, updateOrganization, getUserOrganizations, deleteOrganization, switchOrganization } from '../organization'

// UUID v4形式のテストデータ（有効なUUID形式）
const TEST_ORG_ID = '00000000-0000-4000-8000-000000000001'
const TEST_USER_ID = '00000000-0000-4000-8000-000000000002'

// Supabaseクライアントのモック
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// Next.jsのモック
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
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

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// 組織管理のモック
vi.mock('@/lib/organization/current', () => ({
  setCurrentOrganizationId: vi.fn(),
}))

describe('Organization Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createOrganization', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await createOrganization({
        name: 'テスト組織',
        slug: 'test-org',
      })

      expect(result).toEqual({ error: '認証が必要です' })
    })

    it('slugが重複している場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      // slug重複チェックのモック
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'existing-org-id' },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        single: mockSingle,
      })

      const result = await createOrganization({
        name: 'テスト組織',
        slug: 'existing-slug',
      })

      expect(result).toEqual({ error: 'この組織IDは既に使用されています' })
      expect(mockSupabase.from).toHaveBeenCalledWith('organizations')
    })

    it('組織を正常に作成できる', async () => {
      const mockUser = { id: TEST_USER_ID }
      const mockOrganization = {
        id: TEST_ORG_ID,
        name: 'テスト組織',
        slug: 'test-org',
        subscription_plan: 'free',
        subscription_status: 'trialing',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // slug重複チェック（重複なし）
      const mockSelectCheck = vi.fn().mockReturnThis()
      const mockEqCheck = vi.fn().mockReturnThis()
      const mockSingleCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      // 組織作成のモック
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelectOrg = vi.fn().mockReturnThis()
      const mockSingleOrg = vi.fn().mockResolvedValue({
        data: mockOrganization,
        error: null,
      })

      // メンバー追加のモック
      const mockInsertMember = vi.fn().mockResolvedValue({
        error: null,
      })

      // 監査ログのモック
      const mockInsertAudit = vi.fn().mockResolvedValue({
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++

        // 1回目: slug重複チェック
        if (callCount === 1) {
          return {
            select: mockSelectCheck,
          }
        }

        // 2回目: 組織作成
        if (callCount === 2) {
          return {
            insert: mockInsert,
          }
        }

        // 3回目: メンバー追加
        if (callCount === 3) {
          return {
            insert: mockInsertMember,
          }
        }

        // 4回目: 監査ログ
        if (callCount === 4) {
          return {
            insert: mockInsertAudit,
          }
        }
      })

      mockSelectCheck.mockReturnValue({
        eq: mockEqCheck,
      })

      mockEqCheck.mockReturnValue({
        single: mockSingleCheck,
      })

      mockInsert.mockReturnValue({
        select: mockSelectOrg,
      })

      mockSelectOrg.mockReturnValue({
        single: mockSingleOrg,
      })

      const result = await createOrganization({
        name: 'テスト組織',
        slug: 'test-org',
      })

      expect(result).toEqual({
        success: true,
        organization: mockOrganization,
      })
    })

    it('組織作成に失敗した場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      // slug重複チェック（重複なし）
      const mockSelectCheck = vi.fn().mockReturnThis()
      const mockEqCheck = vi.fn().mockReturnThis()
      const mockSingleCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      // 組織作成失敗のモック
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelectOrg = vi.fn().mockReturnThis()
      const mockSingleOrg = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: mockSelectCheck,
          }
        }

        if (callCount === 2) {
          return {
            insert: mockInsert,
          }
        }
      })

      mockSelectCheck.mockReturnValue({
        eq: mockEqCheck,
      })

      mockEqCheck.mockReturnValue({
        single: mockSingleCheck,
      })

      mockInsert.mockReturnValue({
        select: mockSelectOrg,
      })

      mockSelectOrg.mockReturnValue({
        single: mockSingleOrg,
      })

      const result = await createOrganization({
        name: 'テスト組織',
        slug: 'test-org',
      })

      expect(result).toEqual({
        error: '組織の作成に失敗しました。もう一度お試しください。',
      })
    })
  })

  describe('updateOrganization', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await updateOrganization(TEST_ORG_ID, { name: '新しい名前' })

      expect(result).toEqual({ error: '認証が必要です' })
    })

    it('権限がない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: 'member' }, // memberは権限なし
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      mockEq2.mockReturnValue({
        single: mockSingle,
      })

      const result = await updateOrganization(TEST_ORG_ID, { name: '新しい名前' })

      expect(result).toEqual({ error: '権限がありません' })
    })

    it('オーナーが組織を更新できる', async () => {
      const mockUser = { id: TEST_USER_ID }
      const mockOrganization = {
        id: TEST_ORG_ID,
        name: '更新後の組織名',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // 権限チェック（owner）
      const mockSelectMember = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSingleMember = vi.fn().mockResolvedValue({
        data: { role: 'owner' },
        error: null,
      })

      // 組織更新のモック
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEqUpdate = vi.fn().mockReturnThis()
      const mockSelectUpdate = vi.fn().mockReturnThis()
      const mockSingleUpdate = vi.fn().mockResolvedValue({
        data: mockOrganization,
        error: null,
      })

      // 監査ログのモック
      const mockInsertAudit = vi.fn().mockResolvedValue({
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: mockSelectMember,
          }
        }

        if (callCount === 2) {
          return {
            update: mockUpdate,
          }
        }

        if (callCount === 3) {
          return {
            insert: mockInsertAudit,
          }
        }
      })

      mockSelectMember.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      mockEq2.mockReturnValue({
        single: mockSingleMember,
      })

      mockUpdate.mockReturnValue({
        eq: mockEqUpdate,
      })

      mockEqUpdate.mockReturnValue({
        select: mockSelectUpdate,
      })

      mockSelectUpdate.mockReturnValue({
        single: mockSingleUpdate,
      })

      const result = await updateOrganization(TEST_ORG_ID, { name: '更新後の組織名' })

      expect(result).toEqual({
        success: true,
        organization: mockOrganization,
      })
    })
  })

  describe('getUserOrganizations', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await getUserOrganizations()

      expect(result).toEqual({ error: '認証が必要です' })
    })

    it('ユーザーの組織一覧を取得できる', async () => {
      const mockUser = { id: TEST_USER_ID }
      const mockMemberships = [
        {
          role: 'owner',
          organization: {
            id: TEST_ORG_ID,
            name: '組織1',
            slug: 'org-1',
            subscription_plan: 'pro',
          },
        },
        {
          role: 'member',
          organization: {
            id: '00000000-0000-4000-8000-000000000003',
            name: '組織2',
            slug: 'org-2',
            subscription_plan: 'free',
          },
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMemberships,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        order: mockOrder,
      })

      const result = await getUserOrganizations()

      expect(result).toEqual({
        success: true,
        organizations: mockMemberships,
      })
    })
  })

  describe('deleteOrganization', () => {
    it('オーナーでない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: 'admin' }, // adminはオーナーではない
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      mockEq2.mockReturnValue({
        single: mockSingle,
      })

      const result = await deleteOrganization(TEST_ORG_ID)

      expect(result).toEqual({ error: 'オーナーのみが組織を削除できます' })
    })
  })

  describe('switchOrganization', () => {
    it('組織のメンバーでない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null, // メンバーではない
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      mockEq2.mockReturnValue({
        single: mockSingle,
      })

      const result = await switchOrganization(TEST_ORG_ID)

      expect(result).toEqual({ error: 'この組織にアクセスする権限がありません' })
    })

    it('組織を正常に切り替えできる', async () => {
      const mockUser = { id: TEST_USER_ID }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: '00000000-0000-4000-8000-000000000004' }, // メンバーである
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      mockEq2.mockReturnValue({
        single: mockSingle,
      })

      const result = await switchOrganization(TEST_ORG_ID)

      expect(result).toEqual({ success: true })
    })
  })
})
