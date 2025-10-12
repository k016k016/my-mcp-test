import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as nextNavigation from 'next/navigation'
import { getCurrentUser, getCurrentSession, requireAuth, requireGuest } from '../auth-helpers'

// Supabaseクライアントのモック
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
}

// Next.jsのモック
vi.mock('next/navigation')

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Auth Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('ユーザーが認証されている場合、ユーザー情報を返す', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getCurrentUser()

      expect(result).toEqual(mockUser)
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })

    it('ユーザーが認証されていない場合、nullを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getCurrentUser()

      expect(result).toBeNull()
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })

    it('エラーが発生した場合でもnullを返す', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('getCurrentSession', () => {
    it('セッションが存在する場合、セッション情報を返す', async () => {
      const mockSession = {
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_at: 1234567890,
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await getCurrentSession()

      expect(result).toEqual(mockSession)
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
    })

    it('セッションが存在しない場合、nullを返す', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await getCurrentSession()

      expect(result).toBeNull()
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
    })

    it('エラーが発生した場合でもnullを返す', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      })

      const result = await getCurrentSession()

      expect(result).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('ユーザーが認証されている場合、ユーザー情報を返す', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()

      expect(result).toEqual(mockUser)
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })

    it('ユーザーが認証されていない場合、デフォルトで/loginにリダイレクト', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth()

      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/login')
    })

    it('ユーザーが認証されていない場合、指定のパスにリダイレクト', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth('/custom-login')

      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/custom-login')
    })

    it('認証されていないユーザーに対してリダイレクトが呼ばれる', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      await requireAuth()

      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/login')
    })
  })

  describe('requireGuest', () => {
    it('ユーザーがログインしていない場合、何もしない', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireGuest()

      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })

    it('ユーザーがログインしている場合、デフォルトで/にリダイレクト', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      await requireGuest()

      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/')
    })

    it('ユーザーがログインしている場合、指定のパスにリダイレクト', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      await requireGuest('/dashboard')

      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('統合テスト', () => {
    it('getCurrentUserとrequireAuthは同じユーザー情報を返す', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const user1 = await getCurrentUser()
      const user2 = await requireAuth()

      expect(user1).toEqual(user2)
    })

    it('getCurrentSessionはユーザー情報も含む', async () => {
      const mockSession = {
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        expires_at: 1234567890,
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const session = await getCurrentSession()

      expect(session).toHaveProperty('user')
      expect(session?.user.id).toBe('user-123')
      expect(session?.user.email).toBe('test@example.com')
    })
  })
})
