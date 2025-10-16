import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// @supabase/ssr をモック
const mockCreateBrowserClient = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

describe('Supabase Client (Browser)', () => {
  // 環境変数の元の値を保存
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalSupabaseUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    }

    if (originalSupabaseAnonKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  })

  describe('createClient', () => {
    it('環境変数が設定されている場合、Supabaseクライアントを作成する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const mockClient = { auth: {}, from: vi.fn() }
      mockCreateBrowserClient.mockReturnValue(mockClient)

      // モジュールを再インポート
      const { createClient } = await import('../client')
      const client = createClient()

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookieOptions: expect.any(Object),
        })
      )
      expect(client).toBe(mockClient)
    })

    it('createBrowserClientが正しいパラメータで呼ばれる', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'example-anon-key'

      mockCreateBrowserClient.mockReturnValue({})

      const { createClient } = await import('../client')
      createClient()

      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1)
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'example-anon-key',
        expect.objectContaining({
          cookieOptions: expect.any(Object),
        })
      )
    })

    it('複数回呼び出すと、毎回新しいクライアントを作成する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const mockClient1 = { id: 1 }
      const mockClient2 = { id: 2 }
      mockCreateBrowserClient.mockReturnValueOnce(mockClient1).mockReturnValueOnce(mockClient2)

      const { createClient } = await import('../client')
      const client1 = createClient()
      const client2 = createClient()

      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2)
      expect(client1).toBe(mockClient1)
      expect(client2).toBe(mockClient2)
    })

    it('実際のSupabase URLフォーマットを受け入れる', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'

      mockCreateBrowserClient.mockReturnValue({})

      const { createClient } = await import('../client')
      createClient()

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://abcdefghijklmnop.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        expect.objectContaining({
          cookieOptions: expect.any(Object),
        })
      )
    })

    it('環境変数が未設定でも呼び出せる（エラーは@supabase/ssrが処理）', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      mockCreateBrowserClient.mockReturnValue({})

      const { createClient } = await import('../client')

      // 環境変数がundefinedでも関数自体は実行できる
      expect(() => createClient()).not.toThrow()
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        undefined,
        undefined,
        expect.objectContaining({
          cookieOptions: expect.any(Object),
        })
      )
    })
  })

  describe('環境変数の検証', () => {
    it('NEXT_PUBLIC_SUPABASE_URLが正しく読み込まれる', async () => {
      const testUrl = 'https://test-url.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_URL = testUrl
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      mockCreateBrowserClient.mockReturnValue({})

      const { createClient } = await import('../client')
      createClient()

      const [url] = mockCreateBrowserClient.mock.calls[0]
      expect(url).toBe(testUrl)
    })

    it('NEXT_PUBLIC_SUPABASE_ANON_KEYが正しく読み込まれる', async () => {
      const testKey = 'test-anon-key-123'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = testKey

      mockCreateBrowserClient.mockReturnValue({})

      const { createClient } = await import('../client')
      createClient()

      const [, key] = mockCreateBrowserClient.mock.calls[0]
      expect(key).toBe(testKey)
    })
  })

  describe('返り値の検証', () => {
    it('createBrowserClientの返り値をそのまま返す', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      const mockClient = {
        auth: { signIn: vi.fn(), signOut: vi.fn() },
        from: vi.fn(),
        storage: {},
      }
      mockCreateBrowserClient.mockReturnValue(mockClient)

      const { createClient } = await import('../client')
      const client = createClient()

      expect(client).toBe(mockClient)
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
      expect(client.storage).toBeDefined()
    })
  })
})
