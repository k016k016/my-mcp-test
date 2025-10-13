import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// chargebee-typescript をモック
const mockConfigure = vi.fn()
const mockChargebeeConstructor = vi.fn().mockImplementation(() => ({
  configure: mockConfigure,
}))

vi.mock('chargebee-typescript', () => ({
  ChargeBee: mockChargebeeConstructor,
}))

describe('Chargebee Client', () => {
  // 環境変数の元の値を保存
  const originalChargebeeSite = process.env.CHARGEBEE_SITE
  const originalChargebeeApiKey = process.env.CHARGEBEE_API_KEY
  const originalChargebeePublishableKey = process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalChargebeeSite !== undefined) {
      process.env.CHARGEBEE_SITE = originalChargebeeSite
    } else {
      delete process.env.CHARGEBEE_SITE
    }

    if (originalChargebeeApiKey !== undefined) {
      process.env.CHARGEBEE_API_KEY = originalChargebeeApiKey
    } else {
      delete process.env.CHARGEBEE_API_KEY
    }

    if (originalChargebeePublishableKey !== undefined) {
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = originalChargebeePublishableKey
    } else {
      delete process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY
    }
  })

  describe('getChargebeeClient', () => {
    it('環境変数が設定されている場合、Chargebeeクライアントを作成する', async () => {
      process.env.CHARGEBEE_SITE = 'test-site'
      process.env.CHARGEBEE_API_KEY = 'test-api-key'

      const { getChargebeeClient } = await import('../client')
      const client = getChargebeeClient()

      expect(mockChargebeeConstructor).toHaveBeenCalledTimes(1)
      expect(mockConfigure).toHaveBeenCalledWith({
        site: 'test-site',
        api_key: 'test-api-key',
      })
      expect(client).toBeDefined()
    })

    it('CHARGEBEE_SITEが未設定の場合、エラーを投げる', async () => {
      delete process.env.CHARGEBEE_SITE
      process.env.CHARGEBEE_API_KEY = 'test-api-key'

      const { getChargebeeClient } = await import('../client')

      expect(() => getChargebeeClient()).toThrow(
        'Chargebeeの環境変数が設定されていません。CHARGEBEE_SITEとCHARGEBEE_API_KEYを設定してください。'
      )
    })

    it('CHARGEBEE_API_KEYが未設定の場合、エラーを投げる', async () => {
      process.env.CHARGEBEE_SITE = 'test-site'
      delete process.env.CHARGEBEE_API_KEY

      const { getChargebeeClient } = await import('../client')

      expect(() => getChargebeeClient()).toThrow(
        'Chargebeeの環境変数が設定されていません。CHARGEBEE_SITEとCHARGEBEE_API_KEYを設定してください。'
      )
    })

    it('両方の環境変数が未設定の場合、エラーを投げる', async () => {
      delete process.env.CHARGEBEE_SITE
      delete process.env.CHARGEBEE_API_KEY

      const { getChargebeeClient } = await import('../client')

      expect(() => getChargebeeClient()).toThrow(
        'Chargebeeの環境変数が設定されていません。CHARGEBEE_SITEとCHARGEBEE_API_KEYを設定してください。'
      )
    })

    it('CHARGEBEE_SITEが空文字列の場合、エラーを投げる', async () => {
      process.env.CHARGEBEE_SITE = ''
      process.env.CHARGEBEE_API_KEY = 'test-api-key'

      const { getChargebeeClient } = await import('../client')

      expect(() => getChargebeeClient()).toThrow()
    })

    it('CHARGEBEE_API_KEYが空文字列の場合、エラーを投げる', async () => {
      process.env.CHARGEBEE_SITE = 'test-site'
      process.env.CHARGEBEE_API_KEY = ''

      const { getChargebeeClient } = await import('../client')

      expect(() => getChargebeeClient()).toThrow()
    })

    it('シングルトンパターンで同じインスタンスを返す', async () => {
      process.env.CHARGEBEE_SITE = 'singleton-test-site'
      process.env.CHARGEBEE_API_KEY = 'singleton-test-key'

      const { getChargebeeClient } = await import('../client')

      const client1 = getChargebeeClient()
      const client2 = getChargebeeClient()

      expect(client1).toBe(client2) // 同じインスタンス
      expect(mockChargebeeConstructor).toHaveBeenCalledTimes(1) // 1回だけ作成
    })

    it('異なる環境変数でも最初のインスタンスが再利用される', async () => {
      process.env.CHARGEBEE_SITE = 'first-site'
      process.env.CHARGEBEE_API_KEY = 'first-key'

      const { getChargebeeClient } = await import('../client')

      getChargebeeClient()
      expect(mockConfigure).toHaveBeenCalledWith({
        site: 'first-site',
        api_key: 'first-key',
      })

      // 環境変数を変更してもキャッシュされたインスタンスが返される
      process.env.CHARGEBEE_SITE = 'second-site'
      process.env.CHARGEBEE_API_KEY = 'second-key'
      getChargebeeClient()

      // configureは1回だけ呼ばれる（最初の値で）
      expect(mockConfigure).toHaveBeenCalledTimes(1)
    })
  })

  describe('getChargebeeSite', () => {
    it('CHARGEBEE_SITEが設定されている場合、その値を返す', async () => {
      process.env.CHARGEBEE_SITE = 'test-site-name'

      const { getChargebeeSite } = await import('../client')
      const site = getChargebeeSite()

      expect(site).toBe('test-site-name')
    })

    it('CHARGEBEE_SITEが未設定の場合、エラーを投げる', async () => {
      delete process.env.CHARGEBEE_SITE

      const { getChargebeeSite } = await import('../client')

      expect(() => getChargebeeSite()).toThrow('CHARGEBEE_SITEが設定されていません')
    })

    it('CHARGEBEE_SITEが空文字列の場合、エラーを投げる', async () => {
      process.env.CHARGEBEE_SITE = ''

      const { getChargebeeSite } = await import('../client')

      expect(() => getChargebeeSite()).toThrow('CHARGEBEE_SITEが設定されていません')
    })

    it('複数回呼び出しても同じ値を返す', async () => {
      process.env.CHARGEBEE_SITE = 'consistent-site'

      const { getChargebeeSite } = await import('../client')

      const site1 = getChargebeeSite()
      const site2 = getChargebeeSite()

      expect(site1).toBe(site2)
      expect(site1).toBe('consistent-site')
    })
  })

  describe('getChargebeePublishableKey', () => {
    it('NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが設定されている場合、その値を返す', async () => {
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = 'test_pk_123456'

      const { getChargebeePublishableKey } = await import('../client')
      const key = getChargebeePublishableKey()

      expect(key).toBe('test_pk_123456')
    })

    it('NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが未設定の場合、エラーを投げる', async () => {
      delete process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY

      const { getChargebeePublishableKey } = await import('../client')

      expect(() => getChargebeePublishableKey()).toThrow(
        'NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが設定されていません'
      )
    })

    it('NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが空文字列の場合、エラーを投げる', async () => {
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = ''

      const { getChargebeePublishableKey } = await import('../client')

      expect(() => getChargebeePublishableKey()).toThrow(
        'NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが設定されていません'
      )
    })

    it('複数回呼び出しても同じ値を返す', async () => {
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = 'pk_consistent'

      const { getChargebeePublishableKey } = await import('../client')

      const key1 = getChargebeePublishableKey()
      const key2 = getChargebeePublishableKey()

      expect(key1).toBe(key2)
      expect(key1).toBe('pk_consistent')
    })

    it('test_で始まるテストキーフォーマットを受け入れる', async () => {
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = 'test_pk_abc123'

      const { getChargebeePublishableKey } = await import('../client')
      const key = getChargebeePublishableKey()

      expect(key).toMatch(/^test_/)
    })

    it('live_で始まる本番キーフォーマットを受け入れる', async () => {
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = 'live_pk_xyz789'

      const { getChargebeePublishableKey } = await import('../client')
      const key = getChargebeePublishableKey()

      expect(key).toMatch(/^live_/)
    })
  })

  describe('統合テスト', () => {
    it('すべての環境変数が設定されている場合、すべての関数が正常に動作する', async () => {
      process.env.CHARGEBEE_SITE = 'integration-site'
      process.env.CHARGEBEE_API_KEY = 'integration-key'
      process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = 'test_pk_integration'

      const { getChargebeeClient, getChargebeeSite, getChargebeePublishableKey } =
        await import('../client')

      const client = getChargebeeClient()
      const site = getChargebeeSite()
      const key = getChargebeePublishableKey()

      expect(client).toBeDefined()
      expect(site).toBe('integration-site')
      expect(key).toBe('test_pk_integration')
    })

    it('CHARGEBEE_SITEとCHARGEBEE_API_KEYのみ設定されている場合', async () => {
      process.env.CHARGEBEE_SITE = 'test-site'
      process.env.CHARGEBEE_API_KEY = 'test-key'
      delete process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY

      const { getChargebeeClient, getChargebeeSite, getChargebeePublishableKey } =
        await import('../client')

      expect(() => getChargebeeClient()).not.toThrow()
      expect(() => getChargebeeSite()).not.toThrow()
      expect(() => getChargebeePublishableKey()).toThrow()
    })
  })

  describe('エラーメッセージの検証', () => {
    it('getChargebeeClientのエラーメッセージが適切', async () => {
      delete process.env.CHARGEBEE_SITE
      delete process.env.CHARGEBEE_API_KEY

      const { getChargebeeClient } = await import('../client')

      try {
        getChargebeeClient()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(
          'Chargebeeの環境変数が設定されていません。CHARGEBEE_SITEとCHARGEBEE_API_KEYを設定してください。'
        )
      }
    })

    it('getChargebeeSiteのエラーメッセージが適切', async () => {
      delete process.env.CHARGEBEE_SITE

      const { getChargebeeSite } = await import('../client')

      try {
        getChargebeeSite()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('CHARGEBEE_SITEが設定されていません')
      }
    })

    it('getChargebeePublishableKeyのエラーメッセージが適切', async () => {
      delete process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY

      const { getChargebeePublishableKey } = await import('../client')

      try {
        getChargebeePublishableKey()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(
          'NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが設定されていません'
        )
      }
    })
  })
})
