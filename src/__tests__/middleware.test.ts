import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Supabaseクライアントのモック
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
}

// ドメイン設定のモック
vi.mock('@/lib/domains/config', () => ({
  getDomainFromHost: vi.fn(),
  DOMAINS: {
    WWW: 'www',
    APP: 'app',
    ADMIN: 'admin',
    OPS: 'ops',
  },
  getDomainConfig: vi.fn((domain: string) => ({
    name: domain,
  })),
}))

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Supabaseミドルウェアのモック
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn((request: NextRequest) => {
    return NextResponse.next()
  }),
}))

// 権限チェック関数のモック
vi.mock('@/lib/auth/permissions', () => ({
  isOpsUser: vi.fn(),
  hasAdminAccess: vi.fn(),
}))

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトの環境変数設定
    process.env.NEXT_PUBLIC_WWW_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_URL = 'http://app.localhost:3000'
    process.env.NEXT_PUBLIC_ADMIN_URL = 'http://admin.localhost:3000'
    process.env.NEXT_PUBLIC_OPS_URL = 'http://ops.localhost:3000'
    process.env.OPS_ALLOWED_IPS = ''
  })

  describe('ドメイン判定', () => {
    it('未知のサブドメインの場合は404を返す', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue(null)

      const request = new NextRequest(new URL('http://unknown.localhost:3000/'))
      const response = await middleware(request)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not Found: Unknown subdomain')
    })

    it('WWWドメインの場合、/wwwにリライトする', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('www')

      const request = new NextRequest(new URL('http://localhost:3000/about'))
      const response = await middleware(request)

      // リライトされたURLを確認
      expect(response.headers.get('x-domain')).toBe('www')
      expect(response.headers.get('x-invoke-path')).toBe('/about')
    })

    it('APPドメインの場合、/appにリライトする', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { isOpsUser, hasAdminAccess } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('app')
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest(new URL('http://app.localhost:3000/dashboard'))
      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('app')
      expect(response.headers.get('x-invoke-path')).toBe('/dashboard')
    })
  })

  describe('認証チェック - APPドメイン', () => {
    it('未認証の場合、WWWログインページにリダイレクト', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('app')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest(new URL('http://app.localhost:3000/dashboard'))
      const response = await middleware(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/login')
    })

    it('認証済みの場合、アクセスを許可', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('app')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest(new URL('http://app.localhost:3000/dashboard'))
      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('app')
    })

    it('ログインページは認証チェックをスキップ', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('app')

      // 未認証でもgetUserは呼ばれない
      const request = new NextRequest(new URL('http://app.localhost:3000/login'))
      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('app')
    })
  })

  describe('認証チェック - ADMINドメイン', () => {
    it('未認証の場合、WWWログインページにリダイレクト', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('admin')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest(new URL('http://admin.localhost:3000/settings'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('管理者権限がない場合、APP画面にリダイレクト', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { hasAdminAccess } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('admin')
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      vi.mocked(hasAdminAccess).mockResolvedValue(false)

      const request = new NextRequest(new URL('http://admin.localhost:3000/settings'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('app.localhost:3000')
      // URLエンコードされた日本語をデコードして比較
      const location = decodeURIComponent(response.headers.get('location') || '')
      expect(location).toContain('管理者権限がありません')
    })

    it('管理者権限がある場合、アクセスを許可', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { hasAdminAccess } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('admin')
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      vi.mocked(hasAdminAccess).mockResolvedValue(true)

      const request = new NextRequest(new URL('http://admin.localhost:3000/settings'))
      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('admin')
    })
  })

  describe('認証チェック - OPSドメイン', () => {
    it('未認証の場合、OPSログインページにリダイレクト', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('ops')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest(new URL('http://ops.localhost:3000/system'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('OPS権限がない場合、WWWログインページにリダイレクト', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { isOpsUser } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('ops')
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      vi.mocked(isOpsUser).mockResolvedValue(false)

      const request = new NextRequest(new URL('http://ops.localhost:3000/system'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('localhost:3000/login')
    })

    it('OPS権限がある場合、アクセスを許可', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { isOpsUser } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('ops')
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', user_metadata: { is_ops: true } } },
        error: null,
      })
      vi.mocked(isOpsUser).mockResolvedValue(true)

      const request = new NextRequest(new URL('http://ops.localhost:3000/system'))
      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('ops')
    })
  })

  describe('IP制限 - OPSドメイン', () => {
    it('許可IPリストが設定されていて、許可されていないIPの場合は403を返す', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('ops')
      process.env.OPS_ALLOWED_IPS = '192.168.1.100,10.0.0.1'

      const request = new NextRequest(new URL('http://ops.localhost:3000/system'))
      // x-forwarded-forヘッダーを設定
      request.headers.set('x-forwarded-for', '192.168.1.200')

      const response = await middleware(request)

      expect(response.status).toBe(403)
      expect(await response.text()).toBe('Access Denied: IP not allowed')
    })

    it('許可IPリストが設定されていて、許可されているIPの場合はアクセスを許可', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { isOpsUser } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('ops')
      process.env.OPS_ALLOWED_IPS = '192.168.1.100,10.0.0.1'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', user_metadata: { is_ops: true } } },
        error: null,
      })
      vi.mocked(isOpsUser).mockResolvedValue(true)

      const request = new NextRequest(new URL('http://ops.localhost:3000/system'))
      request.headers.set('x-forwarded-for', '192.168.1.100')

      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('ops')
    })

    it('許可IPリストが設定されていない場合、IP制限をスキップ', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      const { isOpsUser } = await import('@/lib/auth/permissions')

      vi.mocked(getDomainFromHost).mockReturnValue('ops')
      process.env.OPS_ALLOWED_IPS = ''

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', user_metadata: { is_ops: true } } },
        error: null,
      })
      vi.mocked(isOpsUser).mockResolvedValue(true)

      const request = new NextRequest(new URL('http://ops.localhost:3000/system'))
      request.headers.set('x-forwarded-for', '192.168.1.200')

      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('ops')
    })
  })

  describe('WWWドメイン', () => {
    it('WWWドメインは認証チェックをスキップ', async () => {
      const { getDomainFromHost } = await import('@/lib/domains/config')
      vi.mocked(getDomainFromHost).mockReturnValue('www')

      // 未認証でもアクセス可能
      const request = new NextRequest(new URL('http://localhost:3000/'))
      const response = await middleware(request)

      expect(response.headers.get('x-domain')).toBe('www')
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled()
    })
  })
})
