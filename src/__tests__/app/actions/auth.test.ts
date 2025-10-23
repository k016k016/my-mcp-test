/**
 * 認証機能のユニットテスト
 *
 * 注意: このファイルでは基本的なバリデーションとロジックのみをテストしています。
 * 詳細な認証フロー（サインアップ、ログイン、ログアウト、リダイレクトなど）は
 * E2Eテストでカバーしています。複雑なSupabaseモックを避けるため、テストは最小限に
 * 抑えています。
 *
 * 完全な認証フローのテストについては以下を参照してください：
 * @see e2e/auth.spec.ts - 認証フローの完全なE2Eテスト
 *
 * E2Eテストでカバーされている内容：
 * - サインアップフロー（フォーム入力 → DB登録 → プラン選択 → 支払いページ）
 * - ログインフロー（認証 → 権限判定 → ドメインリダイレクト）
 *   - owner権限 → ADMINドメイン
 *   - member権限 → APPドメイン
 * - ログアウトフロー（セッション削除 → WWWドメインリダイレクト）
 * - エラー表示（間違った認証情報、バリデーションエラーなど）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Redisモックを設定
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}))

// レート制限モックを設定
vi.mock('@/lib/rate-limit', () => ({
  rateLimitLogin: vi.fn(),
  rateLimitPasswordReset: vi.fn(),
}))

// Supabaseモックを設定（最小限）
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}))

// 権限チェックモックを設定
vi.mock('@/lib/auth/permissions', () => ({
  getRedirectUrlForUser: vi.fn(),
}))

// 組織管理モックを設定
vi.mock('@/lib/organization/current', () => ({
  setCurrentOrganizationId: vi.fn(),
}))

// Next.jsモックを設定
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { signIn, signUp, resetPassword } from '@/app/actions/auth'
import { rateLimitLogin, rateLimitPasswordReset } from '@/lib/rate-limit'

// モック関数への参照を取得
const mockRateLimitLogin = vi.mocked(rateLimitLogin)
const mockRateLimitPasswordReset = vi.mocked(rateLimitPasswordReset)

describe('Auth Actions - Basic Validation & Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトでレート制限を通過
    mockRateLimitLogin.mockResolvedValue({ success: true, current: 1, limit: 5 })
    mockRateLimitPasswordReset.mockResolvedValue({ success: true, current: 1, limit: 3 })
  })

  describe('signIn - Validation', () => {
    it('無効なメールアドレスを拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')
      formData.append('password', 'Password123')

      const result = await signIn(formData)

      expect(result.error).toBeTruthy()
      expect(result.error).toContain('入力データの検証に失敗しました')
    })

    it('必須フィールド（email）が欠けている場合、エラーを返す', async () => {
      const formData = new FormData()
      // emailが欠けている
      formData.append('password', 'Password123')

      const result = await signIn(formData)

      expect(result.error).toBeTruthy()
    })

    it('必須フィールド（password）が欠けている場合、エラーを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      // passwordが欠けている

      const result = await signIn(formData)

      expect(result.error).toBeTruthy()
    })
  })

  describe('signIn - Rate Limiting', () => {
    it('レート制限を超えた場合、エラーを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')

      mockRateLimitLogin.mockResolvedValue({
        success: false,
        current: 6,
        limit: 5,
        error: 'レート制限を超えました。しばらくしてから再度お試しください。',
      })

      const result = await signIn(formData)

      expect(result.error).toContain('レート制限')
      expect(mockRateLimitLogin).toHaveBeenCalledWith('test@example.com')
    })
  })

  describe('signUp - Validation', () => {
    it('無効な入力を拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid')
      formData.append('password', 'weak')

      const result = await signUp(formData)

      expect(result.error).toBeTruthy()
    })

    it('必須フィールド（companyName、contactName）が欠けている場合、エラーを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Password123')
      // companyName, contactNameが欠けている

      const result = await signUp(formData)

      expect(result.error).toBeTruthy()
    })
  })

  describe('resetPassword - Validation', () => {
    it('無効なメールアドレスを拒否する', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')

      const result = await resetPassword(formData)

      expect(result.error).toBeTruthy()
    })

    it('レート制限を超えた場合、エラーを返す', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')

      mockRateLimitPasswordReset.mockResolvedValue({
        success: false,
        current: 4,
        limit: 3,
        error: 'レート制限を超えました。しばらくしてから再度お試しください。',
      })

      const result = await resetPassword(formData)

      expect(result.error).toContain('レート制限')
      expect(mockRateLimitPasswordReset).toHaveBeenCalledWith('test@example.com')
    })
  })
})
