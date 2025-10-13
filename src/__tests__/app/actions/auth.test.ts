// 認証Server Actionsのテスト
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Supabaseモックを設定
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      getUser: mockGetUser,
    },
  })),
}))

// レート制限モックを設定
const mockRateLimitLogin = vi.fn()
const mockRateLimitPasswordReset = vi.fn()

vi.mock('@/lib/rate-limit', () => ({
  rateLimitLogin: mockRateLimitLogin,
  rateLimitPasswordReset: mockRateLimitPasswordReset,
}))

// Next.jsモックを設定
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`)
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { signIn, signUp, signOut, requestPasswordReset } from '@/app/actions/auth'

describe('Auth Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトでレート制限を通過
    mockRateLimitLogin.mockResolvedValue({ success: true, current: 1, limit: 5 })
    mockRateLimitPasswordReset.mockResolvedValue({ success: true, current: 1, limit: 3 })
  })

  describe('signIn', () => {
    it('有効な認証情報でログインに成功する', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')

      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })

      await expect(signIn(formData)).rejects.toThrow('REDIRECT: /')

      expect(mockRateLimitLogin).toHaveBeenCalledWith('test@example.com')
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      })
    })

    it('無効なメールアドレスを拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')
      formData.append('password', 'Password123')

      const result = await signIn(formData)

      expect(result.error).toBeTruthy()
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('弱いパスワードを拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'weak')

      const result = await signIn(formData)

      expect(result.error).toBeTruthy()
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('レート制限を適用する', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')

      mockRateLimitLogin.mockResolvedValue({
        success: false,
        current: 6,
        limit: 5,
        error: 'レート制限を超えました',
      })

      const result = await signIn(formData)

      expect(result.error).toContain('レート制限')
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('認証エラー時にユーザーフレンドリーなメッセージを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'WrongPassword123')

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const result = await signIn(formData)

      expect(result.error).toBe('メールアドレスまたはパスワードが正しくありません')
    })

    it('予期しないエラーを適切に処理する', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')

      mockSignInWithPassword.mockRejectedValue(new Error('Database error'))

      const result = await signIn(formData)

      expect(result.error).toBe('予期しないエラーが発生しました。もう一度お試しください。')
    })
  })

  describe('signUp', () => {
    it('有効なデータで新規登録に成功する', async () => {
      const formData = new FormData()
      formData.append('email', 'newuser@example.com')
      formData.append('password', 'NewPassword123')

      mockSignUp.mockResolvedValue({
        data: { user: { id: '456' } },
        error: null,
      })

      await expect(signUp(formData)).rejects.toThrow('REDIRECT: /welcome')

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'NewPassword123',
      })
    })

    it('既存のメールアドレスでの登録を拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'existing@example.com')
      formData.append('password', 'Password123')

      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      })

      const result = await signUp(formData)

      expect(result.error).toContain('既に登録されています')
    })

    it('無効な入力を拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid')
      formData.append('password', 'weak')

      const result = await signUp(formData)

      expect(result.error).toBeTruthy()
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('ログアウトに成功する', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      await expect(signOut()).rejects.toThrow('REDIRECT: /')

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('ログアウトエラーを適切に処理する', async () => {
      mockSignOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      })

      const result = await signOut()

      expect(result?.error).toBe('ログアウトに失敗しました。もう一度お試しください。')
    })
  })

  describe('requestPasswordReset', () => {
    it('有効なメールアドレスでパスワードリセットを要求できる', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')

      mockResetPasswordForEmail.mockResolvedValue({ error: null })

      const result = await requestPasswordReset(formData)

      expect(result.success).toBe(true)
      expect(mockRateLimitPasswordReset).toHaveBeenCalledWith('test@example.com')
      expect(mockResetPasswordForEmail).toHaveBeenCalled()
    })

    it('レート制限を適用する', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')

      mockRateLimitPasswordReset.mockResolvedValue({
        success: false,
        current: 4,
        limit: 3,
        error: 'レート制限を超えました',
      })

      const result = await requestPasswordReset(formData)

      expect(result.error).toContain('レート制限')
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
    })

    it('無効なメールアドレスを拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')

      const result = await requestPasswordReset(formData)

      expect(result.error).toBeTruthy()
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
    })
  })
})
