import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as nextCookies from 'next/headers'

// @supabase/ssr をモック
const mockCreateServerClient = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

// Next.js cookies() をモック
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('Supabase Server Client', () => {
  const mockCookies = vi.mocked(nextCookies.cookies)

  // 環境変数の元の値を保存
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // モックされたCookieストア
  let mockCookieStore: {
    getAll: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Cookieストアのモックを作成
    mockCookieStore = {
      getAll: vi.fn(),
      set: vi.fn(),
    }

    mockCookies.mockResolvedValue(mockCookieStore as any)
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
    it('環境変数とCookieハンドラーでSupabaseクライアントを作成する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const mockClient = { auth: {}, from: vi.fn() }
      mockCreateServerClient.mockReturnValue(mockClient)

      const { createClient } = await import('../server')
      const client = await createClient()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
      expect(client).toBe(mockClient)
    })

    it('cookies()が呼ばれる', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      mockCreateServerClient.mockReturnValue({})

      const { createClient } = await import('../server')
      await createClient()

      expect(mockCookies).toHaveBeenCalledTimes(1)
    })

    it('cookieハンドラーのgetAll()が正しく動作する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      const mockCookieData = [
        { name: 'session', value: 'abc123' },
        { name: 'refresh_token', value: 'xyz789' },
      ]
      mockCookieStore.getAll.mockReturnValue(mockCookieData)

      mockCreateServerClient.mockImplementation((url, key, config) => {
        // cookieハンドラーのgetAll()を呼び出してテスト
        const cookies = config.cookies.getAll()
        expect(cookies).toEqual(mockCookieData)
        return {}
      })

      const { createClient } = await import('../server')
      await createClient()

      expect(mockCookieStore.getAll).toHaveBeenCalled()
    })

    it('cookieハンドラーのsetAll()が正しく動作する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      mockCreateServerClient.mockImplementation((url, key, config) => {
        // cookieハンドラーのsetAll()を呼び出してテスト
        const cookiesToSet = [
          { name: 'session', value: 'new-session', options: { maxAge: 3600 } },
          { name: 'refresh', value: 'new-refresh', options: { httpOnly: true } },
        ]
        config.cookies.setAll(cookiesToSet)
        return {}
      })

      const { createClient } = await import('../server')
      await createClient()

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.set).toHaveBeenCalledWith('session', 'new-session', { maxAge: 3600 })
      expect(mockCookieStore.set).toHaveBeenCalledWith('refresh', 'new-refresh', { httpOnly: true })
    })

    it('cookieハンドラーのsetAll()でエラーが発生してもキャッチされる', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Server Component cannot set cookies')
      })

      mockCreateServerClient.mockImplementation((url, key, config) => {
        // エラーを投げるが、キャッチされるべき
        const cookiesToSet = [{ name: 'test', value: 'value', options: {} }]
        expect(() => config.cookies.setAll(cookiesToSet)).not.toThrow()
        return {}
      })

      const { createClient } = await import('../server')
      await createClient()
    })

    it('複数回呼び出すと、毎回新しいクライアントを作成する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      const mockClient1 = { id: 1 }
      const mockClient2 = { id: 2 }
      mockCreateServerClient.mockReturnValueOnce(mockClient1).mockReturnValueOnce(mockClient2)

      const { createClient } = await import('../server')
      const client1 = await createClient()
      const client2 = await createClient()

      expect(mockCreateServerClient).toHaveBeenCalledTimes(2)
      expect(client1).toBe(mockClient1)
      expect(client2).toBe(mockClient2)
    })
  })

  describe('環境変数の検証', () => {
    it('NEXT_PUBLIC_SUPABASE_URLが正しく読み込まれる', async () => {
      const testUrl = 'https://server-test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_URL = testUrl
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      mockCreateServerClient.mockReturnValue({})

      const { createClient } = await import('../server')
      await createClient()

      const [url] = mockCreateServerClient.mock.calls[0]
      expect(url).toBe(testUrl)
    })

    it('NEXT_PUBLIC_SUPABASE_ANON_KEYが正しく読み込まれる', async () => {
      const testKey = 'server-test-key-456'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = testKey

      mockCreateServerClient.mockReturnValue({})

      const { createClient } = await import('../server')
      await createClient()

      const [, key] = mockCreateServerClient.mock.calls[0]
      expect(key).toBe(testKey)
    })
  })

  describe('Cookie操作の統合テスト', () => {
    it('getAll()とsetAll()が連携して動作する', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      const initialCookies = [{ name: 'existing', value: 'cookie' }]
      mockCookieStore.getAll.mockReturnValue(initialCookies)

      mockCreateServerClient.mockImplementation((url, key, config) => {
        // getAll()を呼んで既存のCookieを確認
        const cookies = config.cookies.getAll()
        expect(cookies).toEqual(initialCookies)

        // setAll()で新しいCookieを設定
        config.cookies.setAll([{ name: 'new', value: 'cookie', options: {} }])

        return {}
      })

      const { createClient } = await import('../server')
      await createClient()

      expect(mockCookieStore.getAll).toHaveBeenCalled()
      expect(mockCookieStore.set).toHaveBeenCalledWith('new', 'cookie', {})
    })

    it('空のCookie配列を処理できる', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      mockCookieStore.getAll.mockReturnValue([])

      mockCreateServerClient.mockImplementation((url, key, config) => {
        config.cookies.setAll([])
        return {}
      })

      const { createClient } = await import('../server')
      await createClient()

      expect(mockCookieStore.set).not.toHaveBeenCalled()
    })
  })

  describe('返り値の検証', () => {
    it('createServerClientの返り値をそのまま返す', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

      const mockClient = {
        auth: { signIn: vi.fn(), signOut: vi.fn() },
        from: vi.fn(),
        storage: {},
      }
      mockCreateServerClient.mockReturnValue(mockClient)

      const { createClient } = await import('../server')
      const client = await createClient()

      expect(client).toBe(mockClient)
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
      expect(client.storage).toBeDefined()
    })
  })
})
