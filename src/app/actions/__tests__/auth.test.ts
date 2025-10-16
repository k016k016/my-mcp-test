import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signUp, signIn, signOut, signInWithGoogle, resetPassword, updatePassword } from '../auth'
import * as nextCache from 'next/cache'
import * as nextNavigation from 'next/navigation'

// Supabaseクライアントのモック
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// レート制限のモック
vi.mock('@/lib/rate-limit', () => ({
  rateLimitLogin: vi.fn(),
  rateLimitPasswordReset: vi.fn(),
}))

// 権限チェック関数のモック
vi.mock('@/lib/auth/permissions', () => ({
  getRedirectUrlForUser: vi.fn(),
}))

// Next.jsのモック
vi.mock('next/cache')
vi.mock('next/navigation')

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Auth Actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // デフォルトでレート制限を通過
    const { rateLimitLogin, rateLimitPasswordReset } = await import('@/lib/rate-limit')
    vi.mocked(rateLimitLogin).mockResolvedValue({ success: true, current: 1, limit: 5 })
    vi.mocked(rateLimitPasswordReset).mockResolvedValue({ success: true, current: 1, limit: 3 })
  })

  describe('signUp', () => {
    it('サインアップが成功し、メール確認が必要な場合は確認画面にリダイレクト', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')
      formData.append('confirmPassword', 'password123')
      formData.append('companyName', 'Test Company')
      formData.append('contactName', 'Test User')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: null, // メール確認が必要
        },
        error: null,
      })

      // profiles更新のモック
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await signUp(formData)

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_WWW_URL}/auth/callback`,
          data: {
            company_name: 'Test Company',
            name: 'Test User',
          },
        },
      })
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(result).toEqual({ success: true, requiresEmailConfirmation: true })
    })

    it('サインアップが成功し、即座にログインできた場合はAPPドメインにリダイレクト', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')
      formData.append('confirmPassword', 'password123')
      formData.append('companyName', 'Test Company')
      formData.append('contactName', 'Test User')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'token' }, // セッションあり
        },
        error: null,
      })

      // profiles更新のモック
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await signUp(formData)

      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(result).toEqual({ success: true, requiresEmailConfirmation: false })
    })

    it('パスワードが一致しない場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')
      formData.append('confirmPassword', 'different123')
      formData.append('companyName', 'Test Company')
      formData.append('contactName', 'Test User')

      const result = await signUp(formData)

      // バリデーションエラーが返されることを確認
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })

    it('サインアップに失敗した場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')
      formData.append('confirmPassword', 'Password123')
      formData.append('companyName', 'Test Company')
      formData.append('contactName', 'Test User')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Database error' },
      })

      const result = await signUp(formData)

      expect(result).toEqual({ error: 'サインアップに失敗しました。もう一度お試しください。' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })

  describe('signIn', () => {
    it('運用担当者のログインが成功した場合、OPSドメインにリダイレクト', async () => {
      const { getRedirectUrlForUser } = await import('@/lib/auth/permissions')
      const formData = new FormData()
      formData.append('email', 'ops@example.com')
      formData.append('password', 'password123')

      const mockUser = {
        id: 'user-1',
        email: 'ops@example.com',
        user_metadata: { is_ops: true }
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token' },
        },
        error: null,
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(getRedirectUrlForUser).mockResolvedValue('http://ops.localhost:3000')

      await signIn(formData)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'ops@example.com',
        password: 'password123',
      })
      expect(getRedirectUrlForUser).toHaveBeenCalledWith(mockUser)
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('http://ops.localhost:3000')
    })

    it('管理者のログインが成功した場合、ADMINドメインにリダイレクト', async () => {
      const { getRedirectUrlForUser } = await import('@/lib/auth/permissions')
      const formData = new FormData()
      formData.append('email', 'admin@example.com')
      formData.append('password', 'password123')

      const mockUser = {
        id: 'user-2',
        email: 'admin@example.com'
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token' },
        },
        error: null,
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(getRedirectUrlForUser).mockResolvedValue('http://admin.localhost:3000')

      await signIn(formData)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'password123',
      })
      expect(getRedirectUrlForUser).toHaveBeenCalledWith(mockUser)
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('http://admin.localhost:3000')
    })

    it('一般メンバーのログインが成功した場合、APPドメインにリダイレクト', async () => {
      const { getRedirectUrlForUser } = await import('@/lib/auth/permissions')
      const formData = new FormData()
      formData.append('email', 'member@example.com')
      formData.append('password', 'password123')

      const mockUser = {
        id: 'user-3',
        email: 'member@example.com'
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token' },
        },
        error: null,
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(getRedirectUrlForUser).mockResolvedValue('http://app.localhost:3000')

      await signIn(formData)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'member@example.com',
        password: 'password123',
      })
      expect(getRedirectUrlForUser).toHaveBeenCalledWith(mockUser)
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('http://app.localhost:3000')
    })

    it('組織未所属ユーザーのログインが成功した場合、オンボーディングにリダイレクト', async () => {
      const { getRedirectUrlForUser } = await import('@/lib/auth/permissions')
      const formData = new FormData()
      formData.append('email', 'newuser@example.com')
      formData.append('password', 'password123')

      const mockUser = {
        id: 'user-4',
        email: 'newuser@example.com'
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token' },
        },
        error: null,
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(getRedirectUrlForUser).mockResolvedValue('http://localhost:3000/onboarding/create-organization')

      await signIn(formData)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      })
      expect(getRedirectUrlForUser).toHaveBeenCalledWith(mockUser)
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('http://localhost:3000/onboarding/create-organization')
    })

    it('ログインに失敗した場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'wrongpassword')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const result = await signIn(formData)

      expect(result).toEqual({ error: 'メールアドレスまたはパスワードが正しくありません' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('ログアウトが成功した場合、成功メッセージを返す', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      })

      const result = await signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(result).toEqual({ success: true })
    })

    it('ログアウトに失敗した場合、エラーメッセージを返す', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Signout failed' },
      })

      const result = await signOut()

      expect(result).toEqual({ error: 'ログアウトに失敗しました。もう一度お試しください。' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })

  describe('signInWithGoogle', () => {
    it('Google OAuthのURLが取得できた場合、そのURLにリダイレクト', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: {
          url: 'https://accounts.google.com/oauth...',
        },
        error: null,
      })

      await signInWithGoogle()

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_WWW_URL}/auth/callback`,
        },
      })
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('https://accounts.google.com/oauth...')
    })

    it('Google OAuth認証に失敗した場合、エラーメッセージを返す', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { message: 'OAuth failed' },
      })

      const result = await signInWithGoogle()

      expect(result).toEqual({ error: 'Googleログインに失敗しました。もう一度お試しください。' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    it('パスワードリセットメールの送信が成功した場合、成功メッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await resetPassword(formData)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: `${process.env.NEXT_PUBLIC_WWW_URL}/reset-password`,
        }
      )
      expect(result).toEqual({ success: 'パスワードリセットメールを送信しました。受信箱を確認してください。' })
    })

    it('パスワードリセットメールの送信に失敗した場合でも成功メッセージを返す（セキュリティのため）', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid@example.com')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'User not found' },
      })

      const result = await resetPassword(formData)

      expect(result).toEqual({ success: 'パスワードリセットメールを送信しました。受信箱を確認してください。' })
    })
  })

  describe('updatePassword', () => {
    it('パスワード更新が成功した場合、APPドメインにリダイレクト', async () => {
      const formData = new FormData()
      formData.append('password', 'newpassword123')

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      await updatePassword(formData)

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      })
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith(process.env.NEXT_PUBLIC_APP_URL)
    })

    it('パスワード更新に失敗した場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('password', 'Weak123!')

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak' },
      })

      const result = await updatePassword(formData)

      expect(result).toEqual({ error: 'パスワードの更新に失敗しました。もう一度お試しください。' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })
})
