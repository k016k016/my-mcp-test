import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
  clearCurrentOrganizationId,
} from '../current'
import * as nextCookies from 'next/headers'

// Next.js cookies() をモック
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('Organization Current', () => {
  const mockCookies = vi.mocked(nextCookies.cookies)

  // モックされたCookieストアのメソッド
  let mockCookieStore: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Cookieストアのモックを作成
    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }

    // cookies() がモックされたCookieストアを返すように設定
    mockCookies.mockResolvedValue(mockCookieStore as any)
  })

  describe('getCurrentOrganizationId', () => {
    it('Cookieに組織IDが存在する場合、その値を返す', async () => {
      const organizationId = 'org-123'

      mockCookieStore.get.mockReturnValue({
        name: 'current_organization_id',
        value: organizationId,
      })

      const result = await getCurrentOrganizationId()

      expect(result).toBe(organizationId)
      expect(mockCookieStore.get).toHaveBeenCalledWith('current_organization_id')
    })

    it('Cookieに組織IDが存在しない場合、nullを返す', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await getCurrentOrganizationId()

      expect(result).toBeNull()
      expect(mockCookieStore.get).toHaveBeenCalledWith('current_organization_id')
    })

    it('Cookieの値が空文字列の場合、nullを返す', async () => {
      mockCookieStore.get.mockReturnValue({
        name: 'current_organization_id',
        value: '',
      })

      const result = await getCurrentOrganizationId()

      expect(result).toBeNull()
      expect(mockCookieStore.get).toHaveBeenCalledWith('current_organization_id')
    })

    it('cookies()が正しく呼び出される', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      await getCurrentOrganizationId()

      expect(mockCookies).toHaveBeenCalledTimes(1)
    })
  })

  describe('setCurrentOrganizationId', () => {
    it('組織IDをCookieに設定できる', async () => {
      const organizationId = 'org-456'

      await setCurrentOrganizationId(organizationId)

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        organizationId,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30日間
        })
      )
    })

    it('開発環境ではsecure: falseが設定される', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      await setCurrentOrganizationId('org-789')

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        'org-789',
        expect.objectContaining({
          secure: false,
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('本番環境ではsecure: trueが設定される', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      await setCurrentOrganizationId('org-production')

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        'org-production',
        expect.objectContaining({
          secure: true,
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('httpOnlyフラグが設定される', async () => {
      await setCurrentOrganizationId('org-httponly')

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        'org-httponly',
        expect.objectContaining({
          httpOnly: true,
        })
      )
    })

    it('sameSiteがlaxに設定される', async () => {
      await setCurrentOrganizationId('org-samesite')

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        'org-samesite',
        expect.objectContaining({
          sameSite: 'lax',
        })
      )
    })

    it('maxAgeが30日間に設定される', async () => {
      await setCurrentOrganizationId('org-maxage')

      const expectedMaxAge = 60 * 60 * 24 * 30 // 30日間（秒単位）

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        'org-maxage',
        expect.objectContaining({
          maxAge: expectedMaxAge,
        })
      )
    })

    it('cookies()が正しく呼び出される', async () => {
      await setCurrentOrganizationId('org-test')

      expect(mockCookies).toHaveBeenCalledTimes(1)
    })

    it('異なる組織IDで複数回呼び出せる', async () => {
      await setCurrentOrganizationId('org-first')
      await setCurrentOrganizationId('org-second')

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        1,
        'current_organization_id',
        'org-first',
        expect.any(Object)
      )
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        2,
        'current_organization_id',
        'org-second',
        expect.any(Object)
      )
    })
  })

  describe('clearCurrentOrganizationId', () => {
    it('Cookieから組織IDを削除できる', async () => {
      await clearCurrentOrganizationId()

      expect(mockCookieStore.delete).toHaveBeenCalledWith('current_organization_id')
    })

    it('cookies()が正しく呼び出される', async () => {
      await clearCurrentOrganizationId()

      expect(mockCookies).toHaveBeenCalledTimes(1)
    })

    it('複数回呼び出しても問題ない', async () => {
      await clearCurrentOrganizationId()
      await clearCurrentOrganizationId()

      expect(mockCookieStore.delete).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.delete).toHaveBeenNthCalledWith(1, 'current_organization_id')
      expect(mockCookieStore.delete).toHaveBeenNthCalledWith(2, 'current_organization_id')
    })
  })

  describe('統合テスト', () => {
    it('組織IDを設定してから取得できる', async () => {
      const organizationId = 'org-integration-test'

      // 設定
      await setCurrentOrganizationId(organizationId)

      // モックを更新して、設定した値が取得できるようにする
      mockCookieStore.get.mockReturnValue({
        name: 'current_organization_id',
        value: organizationId,
      })

      // 取得
      const result = await getCurrentOrganizationId()

      expect(result).toBe(organizationId)
    })

    it('組織IDをクリアした後はnullが返る', async () => {
      const organizationId = 'org-to-be-cleared'

      // 設定
      await setCurrentOrganizationId(organizationId)
      mockCookieStore.get.mockReturnValue({
        name: 'current_organization_id',
        value: organizationId,
      })

      // クリア
      await clearCurrentOrganizationId()
      mockCookieStore.get.mockReturnValue(undefined)

      // 取得
      const result = await getCurrentOrganizationId()

      expect(result).toBeNull()
    })

    it('組織IDを変更できる', async () => {
      // 最初の組織を設定
      await setCurrentOrganizationId('org-first')
      mockCookieStore.get.mockReturnValue({
        name: 'current_organization_id',
        value: 'org-first',
      })

      const firstResult = await getCurrentOrganizationId()
      expect(firstResult).toBe('org-first')

      // 別の組織に切り替え
      await setCurrentOrganizationId('org-second')
      mockCookieStore.get.mockReturnValue({
        name: 'current_organization_id',
        value: 'org-second',
      })

      const secondResult = await getCurrentOrganizationId()
      expect(secondResult).toBe('org-second')
    })
  })

  describe('Cookie設定の詳細検証', () => {
    it('すべてのCookie設定が正しく含まれている（開発環境）', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      await setCurrentOrganizationId('org-dev')

      expect(mockCookieStore.set).toHaveBeenCalledWith('current_organization_id', 'org-dev', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 2592000, // 60 * 60 * 24 * 30
      })

      process.env.NODE_ENV = originalEnv
    })

    it('すべてのCookie設定が正しく含まれている（本番環境）', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      await setCurrentOrganizationId('org-prod')

      expect(mockCookieStore.set).toHaveBeenCalledWith('current_organization_id', 'org-prod', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 2592000,
      })

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('エッジケース', () => {
    it('組織IDに特殊文字が含まれていても設定できる', async () => {
      const specialOrgId = 'org-123-abc_xyz'

      await setCurrentOrganizationId(specialOrgId)

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        specialOrgId,
        expect.any(Object)
      )
    })

    it('組織IDが長い文字列でも設定できる', async () => {
      const longOrgId = 'org-' + 'a'.repeat(100)

      await setCurrentOrganizationId(longOrgId)

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        longOrgId,
        expect.any(Object)
      )
    })

    it('UUIDフォーマットの組織IDを設定できる', async () => {
      const uuidOrgId = '550e8400-e29b-41d4-a716-446655440000'

      await setCurrentOrganizationId(uuidOrgId)

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'current_organization_id',
        uuidOrgId,
        expect.any(Object)
      )
    })
  })
})
