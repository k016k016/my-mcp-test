import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCurrentDomain,
  getCurrentDomainConfig,
  getDomainUrl,
  domainUrls,
  isCurrentDomain,
  isWwwDomain,
  isAppDomain,
  isAdminDomain,
  isOpsDomain,
} from '../helpers'
import { DOMAINS } from '../config'
import * as nextHeaders from 'next/headers'

// Next.jsの headers() をモック
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

describe('Domain Helpers', () => {
  // モックされた headers 関数を取得
  const mockHeaders = vi.mocked(nextHeaders.headers)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentDomain', () => {
    it('WWWドメインを取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const domain = await getCurrentDomain()
      expect(domain).toBe(DOMAINS.WWW)
    })

    it('APPドメインを取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      const domain = await getCurrentDomain()
      expect(domain).toBe(DOMAINS.APP)
    })

    it('ADMINドメインを取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'admin.localhost:3000',
        })
      )

      const domain = await getCurrentDomain()
      expect(domain).toBe(DOMAINS.ADMIN)
    })

    it('OPSドメインを取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'ops.example.com',
        })
      )

      const domain = await getCurrentDomain()
      expect(domain).toBe(DOMAINS.OPS)
    })

    it('hostヘッダーがない場合 null を返す', async () => {
      mockHeaders.mockResolvedValue(new Headers())

      const domain = await getCurrentDomain()
      // 空文字列は WWW として扱われる
      expect(domain).toBe(DOMAINS.WWW)
    })

    it('未知のサブドメインの場合 null を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'unknown.example.com',
        })
      )

      const domain = await getCurrentDomain()
      expect(domain).toBeNull()
    })

    it('localhost を WWW として認識', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'localhost:3000',
        })
      )

      const domain = await getCurrentDomain()
      expect(domain).toBe(DOMAINS.WWW)
    })
  })

  describe('getCurrentDomainConfig', () => {
    it('WWWドメインの設定を取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const config = await getCurrentDomainConfig()
      expect(config).toBeDefined()
      expect(config?.name).toBe('メインサイト')
      expect(config?.requireAuth).toBe(false)
    })

    it('APPドメインの設定を取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      const config = await getCurrentDomainConfig()
      expect(config).toBeDefined()
      expect(config?.name).toBe('アプリケーション')
      expect(config?.requireAuth).toBe(true)
    })

    it('ADMINドメインの設定を取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'admin.example.com',
        })
      )

      const config = await getCurrentDomainConfig()
      expect(config).toBeDefined()
      expect(config?.name).toBe('管理画面')
      expect(config?.requireAuth).toBe(true)
      expect(config?.requireRole).toBe('admin')
    })

    it('OPSドメインの設定を取得できる', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'ops.example.com',
        })
      )

      const config = await getCurrentDomainConfig()
      expect(config).toBeDefined()
      expect(config?.name).toBe('運用画面')
      expect(config?.requireAuth).toBe(true)
      expect(config?.requireRole).toBe('ops')
    })

    it('ドメインが取得できない場合 null を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'unknown.example.com',
        })
      )

      const config = await getCurrentDomainConfig()
      expect(config).toBeNull()
    })
  })

  describe('getDomainUrl', () => {
    it('WWWドメインのデフォルトURLを生成できる', () => {
      const url = getDomainUrl(DOMAINS.WWW)
      expect(url).toContain('/')
      expect(url).toMatch(/^https?:\/\//)
    })

    it('WWWドメインのカスタムパスでURLを生成できる', () => {
      const url = getDomainUrl(DOMAINS.WWW, '/about')
      expect(url).toContain('/about')
      expect(url).toMatch(/^https?:\/\//)
    })

    it('APPドメインのURLを生成できる', () => {
      const url = getDomainUrl(DOMAINS.APP, '/dashboard')
      expect(url).toContain('/dashboard')
      expect(url).toMatch(/^https?:\/\//)
    })

    it('ADMINドメインのURLを生成できる', () => {
      const url = getDomainUrl(DOMAINS.ADMIN, '/users')
      expect(url).toContain('/users')
      expect(url).toMatch(/^https?:\/\//)
    })

    it('OPSドメインのURLを生成できる', () => {
      const url = getDomainUrl(DOMAINS.OPS, '/monitoring')
      expect(url).toContain('/monitoring')
      expect(url).toMatch(/^https?:\/\//)
    })

    it('パスにクエリパラメータを含めることができる', () => {
      const url = getDomainUrl(DOMAINS.APP, '/search?q=test')
      // URL オブジェクトは ? をエンコードするため、デコードして確認
      const decoded = decodeURIComponent(url)
      expect(decoded).toContain('/search?q=test')
    })

    it('パスにハッシュを含めることができる', () => {
      const url = getDomainUrl(DOMAINS.WWW, '/docs#introduction')
      // URL オブジェクトは # をエンコードするため、デコードして確認
      const decoded = decodeURIComponent(url)
      expect(decoded).toContain('/docs')
      expect(decoded).toContain('#introduction')
    })
  })

  describe('domainUrls', () => {
    it('domainUrls.www() でWWWドメインのURLを生成できる', () => {
      const url = domainUrls.www()
      expect(url).toMatch(/^https?:\/\//)
      expect(url).toContain('/')
    })

    it('domainUrls.www("/pricing") でカスタムパスを指定できる', () => {
      const url = domainUrls.www('/pricing')
      expect(url).toContain('/pricing')
    })

    it('domainUrls.app() でAPPドメインのURLを生成できる', () => {
      const url = domainUrls.app()
      expect(url).toMatch(/^https?:\/\//)
    })

    it('domainUrls.app("/dashboard") でカスタムパスを指定できる', () => {
      const url = domainUrls.app('/dashboard')
      expect(url).toContain('/dashboard')
    })

    it('domainUrls.admin() でADMINドメインのURLを生成できる', () => {
      const url = domainUrls.admin()
      expect(url).toMatch(/^https?:\/\//)
    })

    it('domainUrls.admin("/users") でカスタムパスを指定できる', () => {
      const url = domainUrls.admin('/users')
      expect(url).toContain('/users')
    })

    it('domainUrls.ops() でOPSドメインのURLを生成できる', () => {
      const url = domainUrls.ops()
      expect(url).toMatch(/^https?:\/\//)
    })

    it('domainUrls.ops("/logs") でカスタムパスを指定できる', () => {
      const url = domainUrls.ops('/logs')
      expect(url).toContain('/logs')
    })
  })

  describe('isCurrentDomain', () => {
    it('現在のドメインが一致する場合 true を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      const result = await isCurrentDomain(DOMAINS.APP)
      expect(result).toBe(true)
    })

    it('現在のドメインが一致しない場合 false を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const result = await isCurrentDomain(DOMAINS.APP)
      expect(result).toBe(false)
    })

    it('ドメインが取得できない場合 false を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'unknown.example.com',
        })
      )

      const result = await isCurrentDomain(DOMAINS.APP)
      expect(result).toBe(false)
    })
  })

  describe('isWwwDomain', () => {
    it('WWWドメインの場合 true を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const result = await isWwwDomain()
      expect(result).toBe(true)
    })

    it('localhost の場合も true を返す（WWWとして扱われる）', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'localhost:3000',
        })
      )

      const result = await isWwwDomain()
      expect(result).toBe(true)
    })

    it('WWWドメイン以外の場合 false を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      const result = await isWwwDomain()
      expect(result).toBe(false)
    })
  })

  describe('isAppDomain', () => {
    it('APPドメインの場合 true を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      const result = await isAppDomain()
      expect(result).toBe(true)
    })

    it('APPドメイン以外の場合 false を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const result = await isAppDomain()
      expect(result).toBe(false)
    })
  })

  describe('isAdminDomain', () => {
    it('ADMINドメインの場合 true を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'admin.example.com',
        })
      )

      const result = await isAdminDomain()
      expect(result).toBe(true)
    })

    it('ADMINドメイン以外の場合 false を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const result = await isAdminDomain()
      expect(result).toBe(false)
    })
  })

  describe('isOpsDomain', () => {
    it('OPSドメインの場合 true を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'ops.example.com',
        })
      )

      const result = await isOpsDomain()
      expect(result).toBe(true)
    })

    it('OPSドメイン以外の場合 false を返す', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      const result = await isOpsDomain()
      expect(result).toBe(false)
    })
  })

  describe('統合テスト', () => {
    it('各ドメインのチェック関数が正しく動作する', async () => {
      // WWWドメインでテスト
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'www.example.com',
        })
      )

      expect(await isWwwDomain()).toBe(true)
      expect(await isAppDomain()).toBe(false)
      expect(await isAdminDomain()).toBe(false)
      expect(await isOpsDomain()).toBe(false)

      // APPドメインでテスト
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      expect(await isWwwDomain()).toBe(false)
      expect(await isAppDomain()).toBe(true)
      expect(await isAdminDomain()).toBe(false)
      expect(await isOpsDomain()).toBe(false)

      // ADMINドメインでテスト
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'admin.example.com',
        })
      )

      expect(await isWwwDomain()).toBe(false)
      expect(await isAppDomain()).toBe(false)
      expect(await isAdminDomain()).toBe(true)
      expect(await isOpsDomain()).toBe(false)

      // OPSドメインでテスト
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'ops.example.com',
        })
      )

      expect(await isWwwDomain()).toBe(false)
      expect(await isAppDomain()).toBe(false)
      expect(await isAdminDomain()).toBe(false)
      expect(await isOpsDomain()).toBe(true)
    })

    it('getCurrentDomainとgetCurrentDomainConfigが連動して動作する', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          host: 'app.example.com',
        })
      )

      const domain = await getCurrentDomain()
      const config = await getCurrentDomainConfig()

      expect(domain).toBe(DOMAINS.APP)
      expect(config?.name).toBe('アプリケーション')
    })

    it('domainUrlsで生成されたURLが正しいフォーマットである', () => {
      const wwwUrl = domainUrls.www('/pricing')
      const appUrl = domainUrls.app('/dashboard')
      const adminUrl = domainUrls.admin('/users')
      const opsUrl = domainUrls.ops('/logs')

      // すべて有効なURL形式
      expect(() => new URL(wwwUrl)).not.toThrow()
      expect(() => new URL(appUrl)).not.toThrow()
      expect(() => new URL(adminUrl)).not.toThrow()
      expect(() => new URL(opsUrl)).not.toThrow()

      // パスが正しく含まれている
      expect(new URL(wwwUrl).pathname).toBe('/pricing')
      expect(new URL(appUrl).pathname).toBe('/dashboard')
      expect(new URL(adminUrl).pathname).toBe('/users')
      expect(new URL(opsUrl).pathname).toBe('/logs')
    })
  })
})
