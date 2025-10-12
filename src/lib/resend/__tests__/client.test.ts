import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getResendClient, getDefaultFromEmail } from '../client'

// Resend パッケージをモック
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation((apiKey: string) => ({
    apiKey,
    emails: {},
  })),
}))

describe('Resend Client', () => {
  // 環境変数の元の値を保存
  const originalResendApiKey = process.env.RESEND_API_KEY
  const originalResendFromEmail = process.env.RESEND_FROM_EMAIL

  beforeEach(() => {
    // 各テストの前にモジュールキャッシュをクリア
    vi.resetModules()
  })

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalResendApiKey !== undefined) {
      process.env.RESEND_API_KEY = originalResendApiKey
    } else {
      delete process.env.RESEND_API_KEY
    }

    if (originalResendFromEmail !== undefined) {
      process.env.RESEND_FROM_EMAIL = originalResendFromEmail
    } else {
      delete process.env.RESEND_FROM_EMAIL
    }
  })

  describe('getResendClient', () => {
    it('RESEND_API_KEYが設定されている場合、Resendクライアントを返す', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      // モジュールを再インポート
      const { getResendClient } = await import('../client')
      const client = getResendClient()

      expect(client).toBeDefined()
      expect(client.apiKey).toBe('test-api-key')
    })

    it('RESEND_API_KEYが未設定の場合、エラーを投げる', async () => {
      delete process.env.RESEND_API_KEY

      // モジュールを再インポート
      const { getResendClient } = await import('../client')

      expect(() => getResendClient()).toThrow(
        'ResendのAPIキーが設定されていません。RESEND_API_KEYを設定してください。'
      )
    })

    it('RESEND_API_KEYが空文字列の場合、エラーを投げる', async () => {
      process.env.RESEND_API_KEY = ''

      // モジュールを再インポート
      const { getResendClient } = await import('../client')

      expect(() => getResendClient()).toThrow(
        'ResendのAPIキーが設定されていません。RESEND_API_KEYを設定してください。'
      )
    })

    it('シングルトンパターンで同じインスタンスを返す', async () => {
      process.env.RESEND_API_KEY = 'singleton-test-key'

      // モジュールを再インポート
      const { getResendClient } = await import('../client')

      const client1 = getResendClient()
      const client2 = getResendClient()

      expect(client1).toBe(client2) // 同じインスタンス
    })

    it('異なるAPIキーでも最初のインスタンスが再利用される', async () => {
      process.env.RESEND_API_KEY = 'first-key'

      // モジュールを再インポート
      const { getResendClient } = await import('../client')

      const client1 = getResendClient()
      expect(client1.apiKey).toBe('first-key')

      // 環境変数を変更してもキャッシュされたインスタンスが返される
      process.env.RESEND_API_KEY = 'second-key'
      const client2 = getResendClient()

      expect(client2).toBe(client1) // 同じインスタンス
      expect(client2.apiKey).toBe('first-key') // 最初のキーのまま
    })
  })

  describe('getDefaultFromEmail', () => {
    it('RESEND_FROM_EMAILが設定されている場合、その値を返す', async () => {
      process.env.RESEND_FROM_EMAIL = 'test@example.com'

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')
      const email = getDefaultFromEmail()

      expect(email).toBe('test@example.com')
    })

    it('RESEND_FROM_EMAILが未設定の場合、エラーを投げる', async () => {
      delete process.env.RESEND_FROM_EMAIL

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')

      expect(() => getDefaultFromEmail()).toThrow('RESEND_FROM_EMAILが設定されていません')
    })

    it('RESEND_FROM_EMAILが空文字列の場合、エラーを投げる', async () => {
      process.env.RESEND_FROM_EMAIL = ''

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')

      expect(() => getDefaultFromEmail()).toThrow('RESEND_FROM_EMAILが設定されていません')
    })

    it('有効なメールアドレスフォーマットを返す', async () => {
      process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')
      const email = getDefaultFromEmail()

      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) // 基本的なメールアドレス形式
    })

    it('名前付きメールアドレス形式も受け入れる', async () => {
      process.env.RESEND_FROM_EMAIL = 'Test User <test@example.com>'

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')
      const email = getDefaultFromEmail()

      expect(email).toBe('Test User <test@example.com>')
      expect(email).toContain('<')
      expect(email).toContain('>')
    })

    it('複数回呼び出しても同じ値を返す', async () => {
      process.env.RESEND_FROM_EMAIL = 'consistent@example.com'

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')

      const email1 = getDefaultFromEmail()
      const email2 = getDefaultFromEmail()

      expect(email1).toBe(email2)
      expect(email1).toBe('consistent@example.com')
    })
  })

  describe('統合テスト', () => {
    it('両方の環境変数が設定されている場合、正常に動作する', async () => {
      process.env.RESEND_API_KEY = 'integration-key'
      process.env.RESEND_FROM_EMAIL = 'integration@example.com'

      // モジュールを再インポート
      const { getResendClient, getDefaultFromEmail } = await import('../client')

      const client = getResendClient()
      const email = getDefaultFromEmail()

      expect(client).toBeDefined()
      expect(client.apiKey).toBe('integration-key')
      expect(email).toBe('integration@example.com')
    })

    it('RESEND_API_KEYのみ未設定の場合、getResendClientのみエラー', async () => {
      delete process.env.RESEND_API_KEY
      process.env.RESEND_FROM_EMAIL = 'test@example.com'

      // モジュールを再インポート
      const { getResendClient, getDefaultFromEmail } = await import('../client')

      expect(() => getResendClient()).toThrow()
      expect(() => getDefaultFromEmail()).not.toThrow()
    })

    it('RESEND_FROM_EMAILのみ未設定の場合、getDefaultFromEmailのみエラー', async () => {
      process.env.RESEND_API_KEY = 'test-key'
      delete process.env.RESEND_FROM_EMAIL

      // モジュールを再インポート
      const { getResendClient, getDefaultFromEmail } = await import('../client')

      expect(() => getResendClient()).not.toThrow()
      expect(() => getDefaultFromEmail()).toThrow()
    })

    it('両方とも未設定の場合、両方エラーを投げる', async () => {
      delete process.env.RESEND_API_KEY
      delete process.env.RESEND_FROM_EMAIL

      // モジュールを再インポート
      const { getResendClient, getDefaultFromEmail } = await import('../client')

      expect(() => getResendClient()).toThrow()
      expect(() => getDefaultFromEmail()).toThrow()
    })
  })

  describe('エラーメッセージの検証', () => {
    it('getResendClientのエラーメッセージが適切', async () => {
      delete process.env.RESEND_API_KEY

      // モジュールを再インポート
      const { getResendClient } = await import('../client')

      try {
        getResendClient()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(
          'ResendのAPIキーが設定されていません。RESEND_API_KEYを設定してください。'
        )
      }
    })

    it('getDefaultFromEmailのエラーメッセージが適切', async () => {
      delete process.env.RESEND_FROM_EMAIL

      // モジュールを再インポート
      const { getDefaultFromEmail } = await import('../client')

      try {
        getDefaultFromEmail()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('RESEND_FROM_EMAILが設定されていません')
      }
    })
  })

  describe('実際のAPIキー形式', () => {
    it('re_で始まる実際のAPIキー形式を受け入れる', async () => {
      process.env.RESEND_API_KEY = 're_123456789abcdefghijklmnopqrstuv'

      // モジュールを再インポート
      const { getResendClient } = await import('../client')
      const client = getResendClient()

      expect(client.apiKey).toMatch(/^re_/)
    })

    it('長いAPIキーも正しく処理する', async () => {
      const longApiKey = 're_' + 'x'.repeat(100)
      process.env.RESEND_API_KEY = longApiKey

      // モジュールを再インポート
      const { getResendClient } = await import('../client')
      const client = getResendClient()

      expect(client.apiKey).toBe(longApiKey)
      expect(client.apiKey.length).toBe(103) // 're_' + 100文字
    })
  })
})
