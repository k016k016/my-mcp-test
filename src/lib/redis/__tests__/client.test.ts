import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// @upstash/redis をモック
const mockRedisConstructor = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: mockRedisConstructor,
}))

describe('Redis Client', () => {
  // 環境変数の元の値を保存
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalUpstashUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL
    }

    if (originalUpstashToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    }
  })

  describe('getRedisClient', () => {
    it('環境変数が設定されている場合、Redisクライアントを作成する', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-123'

      const mockClient = { get: vi.fn(), set: vi.fn() }
      mockRedisConstructor.mockImplementation(() => mockClient)

      const { getRedisClient } = await import('../client')
      const client = getRedisClient()

      expect(mockRedisConstructor).toHaveBeenCalledWith({
        url: 'https://test-redis.upstash.io',
        token: 'test-token-123',
      })
      expect(client).toBe(mockClient)
    })

    it('UPSTASH_REDIS_REST_URLが未設定の場合、エラーを投げる', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { getRedisClient } = await import('../client')

      expect(() => getRedisClient()).toThrow(
        'Upstash Redisの環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('UPSTASH_REDIS_REST_TOKENが未設定の場合、エラーを投げる', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getRedisClient } = await import('../client')

      expect(() => getRedisClient()).toThrow(
        'Upstash Redisの環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('両方の環境変数が未設定の場合、エラーを投げる', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getRedisClient } = await import('../client')

      expect(() => getRedisClient()).toThrow(
        'Upstash Redisの環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('UPSTASH_REDIS_REST_URLが空文字列の場合、エラーを投げる', async () => {
      process.env.UPSTASH_REDIS_REST_URL = ''
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { getRedisClient } = await import('../client')

      expect(() => getRedisClient()).toThrow()
    })

    it('UPSTASH_REDIS_REST_TOKENが空文字列の場合、エラーを投げる', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = ''

      const { getRedisClient } = await import('../client')

      expect(() => getRedisClient()).toThrow()
    })

    it('シングルトンパターンで同じインスタンスを返す', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://singleton-test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'singleton-token'

      const mockClient = { id: 'test-client' }
      mockRedisConstructor.mockImplementation(() => mockClient)

      const { getRedisClient } = await import('../client')

      const client1 = getRedisClient()
      const client2 = getRedisClient()

      expect(client1).toBe(client2) // 同じインスタンス
      expect(mockRedisConstructor).toHaveBeenCalledTimes(1) // 1回だけ作成
    })

    it('異なる環境変数でも最初のインスタンスが再利用される', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://first-url.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'first-token'

      const mockClient = { id: 'first-client' }
      mockRedisConstructor.mockImplementation(() => mockClient)

      const { getRedisClient } = await import('../client')

      const client1 = getRedisClient()
      expect(mockRedisConstructor).toHaveBeenCalledWith({
        url: 'https://first-url.upstash.io',
        token: 'first-token',
      })

      // 環境変数を変更してもキャッシュされたインスタンスが返される
      process.env.UPSTASH_REDIS_REST_URL = 'https://second-url.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'second-token'
      const client2 = getRedisClient()

      expect(client1).toBe(client2) // 同じインスタンス
      expect(mockRedisConstructor).toHaveBeenCalledTimes(1) // 1回だけ作成
    })

    it('実際のUpstash URLフォーマットを受け入れる', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://us1-example-12345.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'AXX0AAIncDEFGHUYXY1234567890'

      const mockClient = { get: vi.fn() }
      mockRedisConstructor.mockImplementation(() => mockClient)

      const { getRedisClient } = await import('../client')
      const client = getRedisClient()

      expect(mockRedisConstructor).toHaveBeenCalledWith({
        url: 'https://us1-example-12345.upstash.io',
        token: 'AXX0AAIncDEFGHUYXY1234567890',
      })
      expect(client).toBeDefined()
    })
  })

  describe('resetRedisClient', () => {
    it('Redisクライアントをリセットできる', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://reset-test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'reset-token'

      const mockClient1 = { id: 'client-1' }
      const mockClient2 = { id: 'client-2' }
      mockRedisConstructor
        .mockImplementationOnce(() => mockClient1)
        .mockImplementationOnce(() => mockClient2)

      const { getRedisClient, resetRedisClient } = await import('../client')

      // 最初のクライアント取得
      const client1 = getRedisClient()
      expect(client1).toBe(mockClient1)

      // リセット
      resetRedisClient()

      // リセット後は新しいインスタンスが作成される
      const client2 = getRedisClient()
      expect(client2).toBe(mockClient2)
      expect(client1).not.toBe(client2)
      expect(mockRedisConstructor).toHaveBeenCalledTimes(2)
    })

    it('リセット後も環境変数が正しく読み込まれる', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://after-reset.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'after-reset-token'

      mockRedisConstructor.mockImplementation(() => ({ test: true }))

      const { getRedisClient, resetRedisClient } = await import('../client')

      getRedisClient()
      resetRedisClient()
      getRedisClient()

      // 2回目の呼び出しでも同じ環境変数が使われる
      expect(mockRedisConstructor).toHaveBeenLastCalledWith({
        url: 'https://after-reset.upstash.io',
        token: 'after-reset-token',
      })
    })

    it('複数回リセットしても問題ない', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://multi-reset.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'multi-reset-token'

      mockRedisConstructor.mockImplementation(() => ({}))

      const { getRedisClient, resetRedisClient } = await import('../client')

      getRedisClient()
      resetRedisClient()
      resetRedisClient()
      resetRedisClient()

      // エラーなく実行できる
      expect(() => resetRedisClient()).not.toThrow()
    })

    it('クライアント取得前にリセットしても問題ない', async () => {
      const { resetRedisClient } = await import('../client')

      // クライアントを取得していない状態でリセット
      expect(() => resetRedisClient()).not.toThrow()
    })
  })

  describe('環境変数の検証', () => {
    it('UPSTASH_REDIS_REST_URLが正しく読み込まれる', async () => {
      const testUrl = 'https://env-test-url.upstash.io'
      process.env.UPSTASH_REDIS_REST_URL = testUrl
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisConstructor.mockImplementation(() => ({}))

      const { getRedisClient } = await import('../client')
      getRedisClient()

      const [config] = mockRedisConstructor.mock.calls[0]
      expect(config.url).toBe(testUrl)
    })

    it('UPSTASH_REDIS_REST_TOKENが正しく読み込まれる', async () => {
      const testToken = 'env-test-token-456'
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = testToken

      mockRedisConstructor.mockImplementation(() => ({}))

      const { getRedisClient } = await import('../client')
      getRedisClient()

      const [config] = mockRedisConstructor.mock.calls[0]
      expect(config.token).toBe(testToken)
    })
  })

  describe('エラーメッセージの検証', () => {
    it('環境変数未設定のエラーメッセージが適切', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getRedisClient } = await import('../client')

      try {
        getRedisClient()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(
          'Upstash Redisの環境変数が設定されていません。.env.localファイルを確認してください。'
        )
      }
    })
  })

  describe('統合テスト', () => {
    it('クライアント取得からリセットまでの一連の流れ', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://integration-test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'integration-token'

      const mockClient1 = { id: 'integration-1' }
      const mockClient2 = { id: 'integration-2' }
      mockRedisConstructor
        .mockImplementationOnce(() => mockClient1)
        .mockImplementationOnce(() => mockClient2)

      const { getRedisClient, resetRedisClient } = await import('../client')

      // 1. クライアント取得
      const client1a = getRedisClient()
      expect(client1a).toBe(mockClient1)

      // 2. 同じインスタンスが返される
      const client1b = getRedisClient()
      expect(client1b).toBe(client1a)
      expect(mockRedisConstructor).toHaveBeenCalledTimes(1)

      // 3. リセット
      resetRedisClient()

      // 4. 新しいインスタンスが作成される
      const client2 = getRedisClient()
      expect(client2).toBe(mockClient2)
      expect(client2).not.toBe(client1a)
      expect(mockRedisConstructor).toHaveBeenCalledTimes(2)
    })

    it('異なるURL形式でもクライアントを作成できる', async () => {
      const testCases = [
        'https://us1-example.upstash.io',
        'https://eu1-example.upstash.io',
        'https://ap1-example.upstash.io',
      ]

      for (const url of testCases) {
        process.env.UPSTASH_REDIS_REST_URL = url
        process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

        mockRedisConstructor.mockImplementation(() => ({}))

        const { getRedisClient, resetRedisClient } = await import('../client')

        // リセットして新しいクライアントを作成
        resetRedisClient()
        getRedisClient()

        expect(mockRedisConstructor).toHaveBeenCalledWith({
          url,
          token: 'test-token',
        })
      }
    })
  })

  describe('実際のトークン形式', () => {
    it('長いトークンを正しく処理する', async () => {
      const longToken = 'AXX0AAInc' + 'x'.repeat(100)
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = longToken

      mockRedisConstructor.mockImplementation(() => ({}))

      const { getRedisClient } = await import('../client')
      getRedisClient()

      const [config] = mockRedisConstructor.mock.calls[0]
      expect(config.token).toBe(longToken)
      expect(config.token.length).toBe(109) // 'AXX0AAInc' + 100文字
    })
  })
})
