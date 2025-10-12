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
  },
}

// Next.jsのモック
vi.mock('next/cache')
vi.mock('next/navigation')

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('サインアップが成功し、メール確認が必要な場合は確認画面にリダイレクト', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: null, // メール確認が必要
        },
        error: null,
      })

      await signUp(formData)

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_WWW_URL}/auth/callback`,
        },
      })
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/auth/verify-email')
    })

    it('サインアップが成功し、即座にログインできた場合はホームにリダイレクト', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'token' }, // セッションあり
        },
        error: null,
      })

      await signUp(formData)

      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/')
    })

    it('サインアップに失敗した場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'weak')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password too weak' },
      })

      const result = await signUp(formData)

      expect(result).toEqual({ error: 'Password too weak' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })

  describe('signIn', () => {
    it('ログインが成功した場合、ホームにリダイレクト', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-1' },
          session: { access_token: 'token' },
        },
        error: null,
      })

      await signIn(formData)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/')
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

      expect(result).toEqual({ error: 'Invalid login credentials' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('ログアウトが成功した場合、ログイン画面にリダイレクト', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      })

      await signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith('/', 'layout')
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/login')
    })

    it('ログアウトに失敗した場合、エラーメッセージを返す', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Signout failed' },
      })

      const result = await signOut()

      expect(result).toEqual({ error: 'Signout failed' })
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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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

      expect(result).toEqual({ error: 'OAuth failed' })
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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
        }
      )
      expect(result).toEqual({ success: 'パスワードリセットメールを送信しました' })
    })

    it('パスワードリセットメールの送信に失敗した場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid@example.com')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'User not found' },
      })

      const result = await resetPassword(formData)

      expect(result).toEqual({ error: 'User not found' })
    })
  })

  describe('updatePassword', () => {
    it('パスワード更新が成功した場合、ホームにリダイレクト', async () => {
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
      expect(vi.mocked(nextNavigation.redirect)).toHaveBeenCalledWith('/')
    })

    it('パスワード更新に失敗した場合、エラーメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('password', 'weak')

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak' },
      })

      const result = await updatePassword(formData)

      expect(result).toEqual({ error: 'Password too weak' })
      expect(vi.mocked(nextNavigation.redirect)).not.toHaveBeenCalled()
    })
  })
})
