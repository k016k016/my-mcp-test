import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteMember, acceptInvitation, updateMemberRole, removeMember } from '../members'

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

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Resendのモック
vi.mock('@/lib/resend/operations', () => ({
  sendEmail: vi.fn(),
}))

describe('Members Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('inviteMember', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await inviteMember('org-1', 'test@example.com', 'member')

      expect(result).toEqual({ error: '認証が必要です' })
    })

    it('権限がない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: 'member' }, // memberは招待権限なし
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

      const result = await inviteMember('org-1', 'test@example.com', 'member')

      expect(result).toEqual({ error: 'メンバーを招待する権限がありません' })
    })

    it('既に招待済みの場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // 権限チェック（admin）
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          // 既存招待チェック
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'invitation-1' }, // 既に招待あり
              error: null,
            }),
          }
        }
      })

      const result = await inviteMember('org-1', 'test@example.com', 'member')

      expect(result).toEqual({ error: 'このメールアドレスには既に招待を送信しています' })
    })
  })

  describe('acceptInvitation', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await acceptInvitation('invalid-token')

      expect(result).toEqual({ error: '認証が必要です。ログインしてから再度お試しください。' })
    })

    it('招待が見つからない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      })

      const result = await acceptInvitation('invalid-token')

      expect(result).toEqual({ error: '招待が見つかりません、または既に使用されています' })
    })

    it('有効期限が切れている場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24) // 1日前

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'invitation-1',
            email: 'test@example.com',
            expires_at: expiredDate.toISOString(),
          },
          error: null,
        }),
      })

      const result = await acceptInvitation('valid-token')

      expect(result).toEqual({ error: '招待の有効期限が切れています' })
    })

    it('メールアドレスが一致しない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24) // 1日後

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // 招待取得
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'invitation-1',
                email: 'invited@example.com',
                expires_at: futureDate.toISOString(),
                organization_id: 'org-1',
                role: 'member',
              },
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          // プロフィール取得
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: 'different@example.com' }, // 異なるメール
              error: null,
            }),
          }
        }
      })

      const result = await acceptInvitation('valid-token')

      expect(result).toEqual({
        error: 'この招待は invited@example.com 宛てです。正しいアカウントでログインしてください。',
      })
    })

    it('既にメンバーの場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24)

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'invitation-1',
                email: 'test@example.com',
                expires_at: futureDate.toISOString(),
                organization_id: 'org-1',
                role: 'member',
              },
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: 'test@example.com' },
              error: null,
            }),
          }
        }

        if (callCount === 3) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'member-1' }, // 既にメンバー
              error: null,
            }),
          }
        }
      })

      const result = await acceptInvitation('valid-token')

      expect(result).toEqual({ error: '既に組織のメンバーです' })
    })
  })

  describe.skip('updateMemberRole', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await updateMemberRole('org-1', 'member-1', 'admin')

      expect(result).toEqual({ error: '認証が必要です' })
    })

    it('権限がない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'member' }, // memberは権限なし
          error: null,
        }),
      })

      const result = await updateMemberRole('org-1', 'member-1', 'admin')

      expect(result).toEqual({ error: 'ロールを変更する権限がありません' })
    })

    it('メンバーが見つからない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // 権限チェック（admin）
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          // 対象メンバー取得
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }
        }
      })

      const result = await updateMemberRole('org-1', 'invalid-member', 'admin')

      expect(result).toEqual({ error: 'メンバーが見つかりません' })
    })

    it('オーナー以外がオーナーを指定しようとした場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' }, // adminはowner指定不可
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member', user_id: 'user-2' },
              error: null,
            }),
          }
        }
      })

      const result = await updateMemberRole('org-1', 'member-1', 'owner')

      expect(result).toEqual({ error: 'オーナーのみが新しいオーナーを指定できます' })
    })

    it('オーナーが自分自身のロールを変更しようとした場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner', user_id: 'user-1' }, // 自分自身
              error: null,
            }),
          }
        }
      })

      const result = await updateMemberRole('org-1', 'member-1', 'admin')

      expect(result).toEqual({ error: 'オーナーは自分自身のロールを変更できません' })
    })
  })

  describe.skip('removeMember', () => {
    it('認証されていない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await removeMember('org-1', 'member-1')

      expect(result).toEqual({ error: '認証が必要です' })
    })

    it('メンバーが見つからない場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await removeMember('org-1', 'invalid-member')

      expect(result).toEqual({ error: 'メンバーが見つかりません' })
    })

    it('オーナーが自分自身を退出しようとした場合、エラーを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'owner', user_id: 'user-1' }, // 自分自身がowner
          error: null,
        }),
      })

      const result = await removeMember('org-1', 'member-1')

      expect(result).toEqual({
        error: 'オーナーは組織から退出できません。組織を削除するか、他のメンバーをオーナーにしてください。',
      })
    })

    it('権限がない場合、他人を削除できない', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // 対象メンバー
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member', user_id: 'user-2' }, // 他人
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          // 自分の権限チェック
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member' }, // memberは削除権限なし
              error: null,
            }),
          }
        }
      })

      const result = await removeMember('org-1', 'member-1')

      expect(result).toEqual({ error: 'メンバーを削除する権限がありません' })
    })

    it('オーナーを削除することはできない', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner', user_id: 'user-2' }, // 他人のowner
              error: null,
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        }
      })

      const result = await removeMember('org-1', 'member-1')

      expect(result).toEqual({ error: 'オーナーを削除することはできません' })
    })
  })
})
