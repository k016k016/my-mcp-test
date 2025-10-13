import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

// posthog-js をモック
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
  },
}))

// posthog-js/react をモック
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// next/navigation をモック
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

// モジュールをインポート
import { initPostHog, PostHogProvider, PostHogPageView } from '../client'
import posthog from 'posthog-js'
import { usePathname, useSearchParams } from 'next/navigation'

describe('PostHog Client', () => {
  // モック関数への参照を取得
  const mockPostHogInit = vi.mocked(posthog.init)
  const mockPostHogCapture = vi.mocked(posthog.capture)
  const mockPathname = vi.mocked(usePathname)
  const mockSearchParams = vi.mocked(useSearchParams)
  // 環境変数の元の値を保存
  const originalPostHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const originalPostHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
  const originalWindow = global.window

  beforeEach(() => {
    vi.clearAllMocks()
    // window オブジェクトをモック
    global.window = {
      origin: 'https://test.example.com',
    } as any
  })

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalPostHogKey !== undefined) {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalPostHogKey
    } else {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    }

    if (originalPostHogHost !== undefined) {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = originalPostHogHost
    } else {
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    }

    // window オブジェクトを元に戻す
    global.window = originalWindow
  })

  describe('initPostHog', () => {
    it('NEXT_PUBLIC_POSTHOG_KEYが設定されている場合、PostHogを初期化する', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test-posthog.com'

      initPostHog()

      expect(mockPostHogInit).toHaveBeenCalledWith('test-posthog-key', {
        api_host: 'https://test-posthog.com',
        capture_pageview: false,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
        },
      })
    })

    it('NEXT_PUBLIC_POSTHOG_HOSTが未設定の場合、デフォルトホストを使用する', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST

      initPostHog()

      expect(mockPostHogInit).toHaveBeenCalledWith('test-key', {
        api_host: 'https://app.posthog.com',
        capture_pageview: false,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
        },
      })
    })

    it('NEXT_PUBLIC_POSTHOG_KEYが未設定の場合、初期化しない', () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY

      initPostHog()

      expect(mockPostHogInit).not.toHaveBeenCalled()
    })

    it('NEXT_PUBLIC_POSTHOG_KEYが空文字列の場合、初期化しない', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = ''

      initPostHog()

      expect(mockPostHogInit).not.toHaveBeenCalled()
    })

    it('PostHogインスタンスを返す', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      const result = initPostHog()

      expect(result).toBeDefined()
      expect(result.init).toBe(mockPostHogInit)
      expect(result.capture).toBe(mockPostHogCapture)
    })

    it('capture_pageviewがfalseに設定される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      initPostHog()

      const [, config] = mockPostHogInit.mock.calls[0]
      expect(config.capture_pageview).toBe(false)
    })

    it('セッションレコーディング設定が正しく適用される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      initPostHog()

      const [, config] = mockPostHogInit.mock.calls[0]
      expect(config.session_recording).toEqual({
        maskAllInputs: true,
        maskTextSelector: '*',
      })
    })

    it('複数回呼び出すと、複数回初期化される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      initPostHog()
      initPostHog()

      expect(mockPostHogInit).toHaveBeenCalledTimes(2)
    })
  })

  describe('PostHogProvider', () => {
    it('子要素をレンダリングできる', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      const { getByText } = render(
        <PostHogProvider>
          <div>Test Content</div>
        </PostHogProvider>
      )

      expect(getByText('Test Content')).toBeDefined()
    })

    it('PostHogを初期化する', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'provider-test-key'

      render(
        <PostHogProvider>
          <div>Content</div>
        </PostHogProvider>
      )

      expect(mockPostHogInit).toHaveBeenCalledWith(
        'provider-test-key',
        expect.objectContaining({
          capture_pageview: false,
        })
      )
    })

    it('複数の子要素をレンダリングできる', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      const { getByText } = render(
        <PostHogProvider>
          <div>First Child</div>
          <div>Second Child</div>
        </PostHogProvider>
      )

      expect(getByText('First Child')).toBeDefined()
      expect(getByText('Second Child')).toBeDefined()
    })
  })

  describe('PostHogPageView', () => {
    it('パス名が変更されたときにページビューをキャプチャする', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue('/test-page')
      mockSearchParams.mockReturnValue(null)

      render(<PostHogPageView />)

      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://test.example.com/test-page',
      })
    })

    it('クエリパラメータを含むURLでページビューをキャプチャする', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue('/search')
      mockSearchParams.mockReturnValue({
        toString: () => 'q=test&page=1',
      })

      render(<PostHogPageView />)

      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://test.example.com/search?q=test&page=1',
      })
    })

    it('パス名がnullの場合、ページビューをキャプチャしない', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue(null)
      mockSearchParams.mockReturnValue(null)

      render(<PostHogPageView />)

      expect(mockPostHogCapture).not.toHaveBeenCalled()
    })

    it('nullを返す', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue('/test')
      mockSearchParams.mockReturnValue(null)

      const { container } = render(<PostHogPageView />)

      // nullを返すため、何もレンダリングされない
      expect(container.firstChild).toBeNull()
    })

    it('異なるパスでページビューをキャプチャする', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue('/dashboard')
      mockSearchParams.mockReturnValue(null)

      render(<PostHogPageView />)

      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://test.example.com/dashboard',
      })
    })

    it('空のクエリパラメータを正しく処理する', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue('/page')
      mockSearchParams.mockReturnValue({
        toString: () => '',
      })

      render(<PostHogPageView />)

      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://test.example.com/page',
      })
    })

    it('複雑なクエリパラメータを処理できる', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      mockPathname.mockReturnValue('/products')
      mockSearchParams.mockReturnValue({
        toString: () => 'category=electronics&price_min=100&price_max=500',
      })

      render(<PostHogPageView />)

      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url:
          'https://test.example.com/products?category=electronics&price_min=100&price_max=500',
      })
    })
  })

  describe('統合テスト', () => {
    it('PostHogProviderとPostHogPageViewを一緒に使用できる', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'integration-key'
      mockPathname.mockReturnValue('/integration-test')
      mockSearchParams.mockReturnValue(null)

      const { getByText } = render(
        <PostHogProvider>
          <PostHogPageView />
          <div>Integration Test Content</div>
        </PostHogProvider>
      )

      expect(mockPostHogInit).toHaveBeenCalledWith(
        'integration-key',
        expect.objectContaining({
          capture_pageview: false,
        })
      )
      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://test.example.com/integration-test',
      })
      expect(getByText('Integration Test Content')).toBeDefined()
    })

    it('環境変数が未設定でもエラーなく動作する', () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY
      mockPathname.mockReturnValue('/test')
      mockSearchParams.mockReturnValue(null)

      const { container } = render(
        <PostHogProvider>
          <PostHogPageView />
          <div>Content Without PostHog</div>
        </PostHogProvider>
      )

      expect(mockPostHogInit).not.toHaveBeenCalled()
      expect(container).toBeDefined()
    })
  })

  describe('環境変数の検証', () => {
    it('NEXT_PUBLIC_POSTHOG_KEYが正しく読み込まれる', () => {
      const testKey = 'test-api-key-123'
      process.env.NEXT_PUBLIC_POSTHOG_KEY = testKey

      initPostHog()

      const [apiKey] = mockPostHogInit.mock.calls[0]
      expect(apiKey).toBe(testKey)
    })

    it('NEXT_PUBLIC_POSTHOG_HOSTが正しく読み込まれる', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      const testHost = 'https://custom-posthog.myapp.com'
      process.env.NEXT_PUBLIC_POSTHOG_HOST = testHost

      initPostHog()

      const [, config] = mockPostHogInit.mock.calls[0]
      expect(config.api_host).toBe(testHost)
    })

    it('複数の異なるAPIキーで初期化できる', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'first-key'
      initPostHog()

      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'second-key'
      initPostHog()

      expect(mockPostHogInit).toHaveBeenCalledTimes(2)
      expect(mockPostHogInit).toHaveBeenNthCalledWith(
        1,
        'first-key',
        expect.any(Object)
      )
      expect(mockPostHogInit).toHaveBeenNthCalledWith(
        2,
        'second-key',
        expect.any(Object)
      )
    })
  })

  describe('セキュリティ設定', () => {
    it('maskAllInputsがtrueに設定される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      initPostHog()

      const [, config] = mockPostHogInit.mock.calls[0]
      expect(config.session_recording.maskAllInputs).toBe(true)
    })

    it('maskTextSelectorが"*"に設定される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'

      initPostHog()

      const [, config] = mockPostHogInit.mock.calls[0]
      expect(config.session_recording.maskTextSelector).toBe('*')
    })
  })

  describe('window オブジェクトの検証', () => {
    it('windowオブジェクトが存在する場合に初期化される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      global.window = { origin: 'https://test.com' } as any

      initPostHog()

      expect(mockPostHogInit).toHaveBeenCalled()
    })

    it('windowオブジェクトのoriginが正しく使用される', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      global.window = { origin: 'https://myapp.example.com' } as any
      mockPathname.mockReturnValue('/test-page')
      mockSearchParams.mockReturnValue(null)

      render(<PostHogPageView />)

      expect(mockPostHogCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://myapp.example.com/test-page',
      })
    })
  })
})
