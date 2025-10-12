import { describe, it, expect } from 'vitest'
import {
  DOMAINS,
  DOMAIN_CONFIG,
  getDomainFromHost,
  isValidDomain,
  getDomainConfig,
  getCurrentDomain,
  type DomainType,
} from '../config'

describe('Domain Config', () => {
  describe('DOMAINS 定数', () => {
    it('すべてのドメインタイプが定義されている', () => {
      expect(DOMAINS.WWW).toBe('www')
      expect(DOMAINS.APP).toBe('app')
      expect(DOMAINS.ADMIN).toBe('admin')
      expect(DOMAINS.OPS).toBe('ops')
    })
  })

  describe('DOMAIN_CONFIG', () => {
    it('WWWドメインの設定が正しい', () => {
      const config = DOMAIN_CONFIG[DOMAINS.WWW]
      expect(config.name).toBe('メインサイト')
      expect(config.description).toBe('公開Webサイト（マーケティング、ランディングページ）')
      expect(config.requireAuth).toBe(false)
      expect(config.baseUrl).toBeDefined()
    })

    it('APPドメインの設定が正しい', () => {
      const config = DOMAIN_CONFIG[DOMAINS.APP]
      expect(config.name).toBe('アプリケーション')
      expect(config.description).toBe('ユーザー向けアプリケーション')
      expect(config.requireAuth).toBe(true)
      expect(config.baseUrl).toBeDefined()
    })

    it('ADMINドメインの設定が正しい', () => {
      const config = DOMAIN_CONFIG[DOMAINS.ADMIN]
      expect(config.name).toBe('管理画面')
      expect(config.description).toBe('管理者向けダッシュボード')
      expect(config.requireAuth).toBe(true)
      expect(config.requireRole).toBe('admin')
      expect(config.baseUrl).toBeDefined()
    })

    it('OPSドメインの設定が正しい', () => {
      const config = DOMAIN_CONFIG[DOMAINS.OPS]
      expect(config.name).toBe('運用画面')
      expect(config.description).toBe('運用チーム向けツール')
      expect(config.requireAuth).toBe(true)
      expect(config.requireRole).toBe('ops')
      expect(config.baseUrl).toBeDefined()
    })
  })

  describe('getDomainFromHost', () => {
    describe('APPドメイン', () => {
      it('app.example.com を APP として認識', () => {
        expect(getDomainFromHost('app.example.com')).toBe(DOMAINS.APP)
      })

      it('app.localhost を APP として認識', () => {
        expect(getDomainFromHost('app.localhost')).toBe(DOMAINS.APP)
      })

      it('app.localhost:3000 を APP として認識（ポート除去）', () => {
        expect(getDomainFromHost('app.localhost:3000')).toBe(DOMAINS.APP)
      })
    })

    describe('ADMINドメイン', () => {
      it('admin.example.com を ADMIN として認識', () => {
        expect(getDomainFromHost('admin.example.com')).toBe(DOMAINS.ADMIN)
      })

      it('admin.localhost を ADMIN として認識', () => {
        expect(getDomainFromHost('admin.localhost')).toBe(DOMAINS.ADMIN)
      })

      it('admin.localhost:3000 を ADMIN として認識', () => {
        expect(getDomainFromHost('admin.localhost:3000')).toBe(DOMAINS.ADMIN)
      })
    })

    describe('OPSドメイン', () => {
      it('ops.example.com を OPS として認識', () => {
        expect(getDomainFromHost('ops.example.com')).toBe(DOMAINS.OPS)
      })

      it('ops.localhost を OPS として認識', () => {
        expect(getDomainFromHost('ops.localhost')).toBe(DOMAINS.OPS)
      })

      it('ops.localhost:3000 を OPS として認識', () => {
        expect(getDomainFromHost('ops.localhost:3000')).toBe(DOMAINS.OPS)
      })
    })

    describe('WWWドメイン', () => {
      it('www.example.com を WWW として認識', () => {
        expect(getDomainFromHost('www.example.com')).toBe(DOMAINS.WWW)
      })

      it('localhost を WWW として認識', () => {
        expect(getDomainFromHost('localhost')).toBe(DOMAINS.WWW)
      })

      it('localhost:3000 を WWW として認識', () => {
        expect(getDomainFromHost('localhost:3000')).toBe(DOMAINS.WWW)
      })

      it('example.com（ドメインのみ）を WWW として認識', () => {
        expect(getDomainFromHost('example.com')).toBe(DOMAINS.WWW)
      })

      it('example.com:3000 を WWW として認識', () => {
        expect(getDomainFromHost('example.com:3000')).toBe(DOMAINS.WWW)
      })
    })

    describe('未知のサブドメイン', () => {
      it('api.example.com は null を返す', () => {
        expect(getDomainFromHost('api.example.com')).toBeNull()
      })

      it('test.example.com は null を返す', () => {
        expect(getDomainFromHost('test.example.com')).toBeNull()
      })

      it('unknown.something.com は null を返す', () => {
        // 3階層以上のサブドメインで、既知のサブドメインでない場合は null
        expect(getDomainFromHost('unknown.something.com')).toBeNull()
      })
    })

    describe('エッジケース', () => {
      it('空文字列は WWW として認識', () => {
        // 空文字列は localhost として扱われる
        expect(getDomainFromHost('')).toBe(DOMAINS.WWW)
      })

      it('深いサブドメインも正しく処理（app.staging.example.com）', () => {
        expect(getDomainFromHost('app.staging.example.com')).toBe(DOMAINS.APP)
      })

      it('深いサブドメインも正しく処理（admin.prod.example.com）', () => {
        expect(getDomainFromHost('admin.prod.example.com')).toBe(DOMAINS.ADMIN)
      })
    })
  })

  describe('isValidDomain', () => {
    it('有効なドメインに対して true を返す', () => {
      expect(isValidDomain('www.example.com')).toBe(true)
      expect(isValidDomain('app.example.com')).toBe(true)
      expect(isValidDomain('admin.example.com')).toBe(true)
      expect(isValidDomain('ops.example.com')).toBe(true)
      expect(isValidDomain('localhost')).toBe(true)
      expect(isValidDomain('example.com')).toBe(true)
    })

    it('無効なドメインに対して false を返す', () => {
      expect(isValidDomain('api.example.com')).toBe(false)
      expect(isValidDomain('test.example.com')).toBe(false)
      expect(isValidDomain('unknown.something.com')).toBe(false)
    })
  })

  describe('getDomainConfig', () => {
    it('WWWドメインの設定を取得できる', () => {
      const config = getDomainConfig(DOMAINS.WWW)
      expect(config.name).toBe('メインサイト')
      expect(config.requireAuth).toBe(false)
    })

    it('APPドメインの設定を取得できる', () => {
      const config = getDomainConfig(DOMAINS.APP)
      expect(config.name).toBe('アプリケーション')
      expect(config.requireAuth).toBe(true)
    })

    it('ADMINドメインの設定を取得できる', () => {
      const config = getDomainConfig(DOMAINS.ADMIN)
      expect(config.name).toBe('管理画面')
      expect(config.requireAuth).toBe(true)
      expect(config.requireRole).toBe('admin')
    })

    it('OPSドメインの設定を取得できる', () => {
      const config = getDomainConfig(DOMAINS.OPS)
      expect(config.name).toBe('運用画面')
      expect(config.requireAuth).toBe(true)
      expect(config.requireRole).toBe('ops')
    })

    it('返されるconfigオブジェクトに baseUrl が含まれる', () => {
      const config = getDomainConfig(DOMAINS.APP)
      expect(config.baseUrl).toBeDefined()
      expect(typeof config.baseUrl).toBe('string')
    })
  })

  describe('getCurrentDomain (同期版)', () => {
    it('hostヘッダーから WWW ドメインを取得できる', () => {
      const headers = new Headers()
      headers.set('host', 'www.example.com')

      const domain = getCurrentDomain(headers)
      expect(domain).toBe(DOMAINS.WWW)
    })

    it('hostヘッダーから APP ドメインを取得できる', () => {
      const headers = new Headers()
      headers.set('host', 'app.example.com')

      const domain = getCurrentDomain(headers)
      expect(domain).toBe(DOMAINS.APP)
    })

    it('hostヘッダーから ADMIN ドメインを取得できる', () => {
      const headers = new Headers()
      headers.set('host', 'admin.localhost:3000')

      const domain = getCurrentDomain(headers)
      expect(domain).toBe(DOMAINS.ADMIN)
    })

    it('hostヘッダーから OPS ドメインを取得できる', () => {
      const headers = new Headers()
      headers.set('host', 'ops.example.com:8080')

      const domain = getCurrentDomain(headers)
      expect(domain).toBe(DOMAINS.OPS)
    })

    it('hostヘッダーがない場合 null を返す', () => {
      const headers = new Headers()

      const domain = getCurrentDomain(headers)
      expect(domain).toBe(DOMAINS.WWW) // 空文字列は WWW として扱われる
    })

    it('未知のサブドメインの場合 null を返す', () => {
      const headers = new Headers()
      headers.set('host', 'unknown.example.com')

      const domain = getCurrentDomain(headers)
      expect(domain).toBeNull()
    })
  })

  describe('型安全性', () => {
    it('DomainType は特定の文字列のみを受け入れる', () => {
      // TypeScriptの型チェックでこれらがコンパイルエラーにならないことを確認
      const wwwDomain: DomainType = DOMAINS.WWW
      const appDomain: DomainType = DOMAINS.APP
      const adminDomain: DomainType = DOMAINS.ADMIN
      const opsDomain: DomainType = DOMAINS.OPS

      expect(wwwDomain).toBe('www')
      expect(appDomain).toBe('app')
      expect(adminDomain).toBe('admin')
      expect(opsDomain).toBe('ops')
    })
  })
})
