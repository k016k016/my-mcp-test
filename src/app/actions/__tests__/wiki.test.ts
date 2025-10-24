import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createWikiPage,
  updateWikiPage,
  deleteWikiPage,
  getWikiPage,
  getWikiPageList,
  searchWikiPages,
} from '../wiki'

// UUID v4形式のテストデータ
const TEST_ORG_ID = '00000000-0000-4000-8000-000000000001'
const TEST_USER_ID = '00000000-0000-4000-8000-000000000002'
const TEST_PAGE_ID = '00000000-0000-4000-8000-000000000003'

// Supabaseクライアントのモック
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}

// Next.jsのモック
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// 組織管理のモック
vi.mock('@/lib/organization/current', () => ({
  getCurrentOrganizationId: vi.fn(() => Promise.resolve(TEST_ORG_ID)),
}))

describe('Wiki Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createWikiPage', () => {
    it('認証されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await createWikiPage({
        title: 'テストページ',
        slug: 'test-page',
        content: 'テストコンテンツ',
      })

      expect(result).toEqual({ error: 'Unauthorized' })
    })

    it('組織が選択されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(null)

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      const result = await createWikiPage({
        title: 'テストページ',
        slug: 'test-page',
        content: 'テストコンテンツ',
      })

      expect(result).toEqual({ error: 'No organization selected' })
    })

    it('Wikiページを正常に作成できる', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      const mockUser = { id: TEST_USER_ID }
      const mockPage = {
        id: TEST_PAGE_ID,
        organization_id: TEST_ORG_ID,
        title: 'テストページ',
        slug: 'test-page',
        content: 'テストコンテンツ',
        is_published: true,
        view_count: 0,
        created_by: TEST_USER_ID,
        updated_by: TEST_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockPage,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      const result = await createWikiPage({
        title: 'テストページ',
        slug: 'test-page',
        content: 'テストコンテンツ',
      })

      expect(result).toEqual({
        success: true,
        page: mockPage,
      })
    })

    it('作成に失敗した場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Duplicate slug' },
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      const result = await createWikiPage({
        title: 'テストページ',
        slug: 'test-page',
        content: 'テストコンテンツ',
      })

      expect(result).toEqual({
        error: 'ページの作成に失敗しました',
      })
    })
  })

  describe('updateWikiPage', () => {
    it('認証されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await updateWikiPage(TEST_PAGE_ID, {
        title: '更新後のタイトル',
      })

      expect(result).toEqual({ error: 'Unauthorized' })
    })

    it('Wikiページを正常に更新できる', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      const mockUser = { id: TEST_USER_ID }
      const mockPage = {
        id: TEST_PAGE_ID,
        organization_id: TEST_ORG_ID,
        title: '更新後のタイトル',
        slug: 'test-page',
        content: 'テストコンテンツ',
        is_published: true,
        view_count: 0,
        created_by: TEST_USER_ID,
        updated_by: TEST_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockPage,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      mockUpdate.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      mockEq2.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      const result = await updateWikiPage(TEST_PAGE_ID, {
        title: '更新後のタイトル',
      })

      expect(result).toEqual({
        success: true,
        page: mockPage,
      })
    })
  })

  describe('deleteWikiPage', () => {
    it('認証されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await deleteWikiPage(TEST_PAGE_ID)

      expect(result).toEqual({ error: 'Unauthorized' })
    })

    it('Wikiページを正常に削除できる', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      const mockUser = { id: TEST_USER_ID }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      const result = await deleteWikiPage(TEST_PAGE_ID)

      expect(result).toEqual({
        success: true,
      })
    })
  })

  describe('getWikiPage', () => {
    it('組織が選択されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(null)

      const result = await getWikiPage('test-page')

      expect(result).toEqual({ error: 'No organization selected' })
    })

    it('Wikiページを正常に取得できる', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      const mockPage = {
        id: TEST_PAGE_ID,
        organization_id: TEST_ORG_ID,
        title: 'テストページ',
        slug: 'test-page',
        content: 'テストコンテンツ',
        is_published: true,
        view_count: 5,
        created_by: TEST_USER_ID,
        updated_by: TEST_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // ページ取得
          const mockSelect = vi.fn().mockReturnThis()
          const mockEq1 = vi.fn().mockReturnThis()
          const mockEq2 = vi.fn().mockReturnThis()
          const mockEq3 = vi.fn().mockReturnThis()
          const mockSingle = vi.fn().mockResolvedValue({
            data: mockPage,
            error: null,
          })

          mockSelect.mockReturnValue({ eq: mockEq1 })
          mockEq1.mockReturnValue({ eq: mockEq2 })
          mockEq2.mockReturnValue({ eq: mockEq3 })
          mockEq3.mockReturnValue({ single: mockSingle })

          return { select: mockSelect }
        }

        if (callCount === 2) {
          // view_count更新
          const mockUpdate = vi.fn().mockReturnThis()
          const mockEq = vi.fn().mockResolvedValue({ error: null })

          mockUpdate.mockReturnValue({ eq: mockEq })

          return { update: mockUpdate }
        }
      })

      const result = await getWikiPage('test-page')

      expect(result).toEqual({
        success: true,
        page: mockPage,
      })
    })
  })

  describe('getWikiPageList', () => {
    it('組織が選択されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(null)

      const result = await getWikiPageList()

      expect(result).toEqual({ error: 'No organization selected' })
    })

    it('Wikiページ一覧を正常に取得できる', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      const mockPages = [
        {
          id: TEST_PAGE_ID,
          title: 'ページ1',
          slug: 'page-1',
          view_count: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '00000000-0000-4000-8000-000000000004',
          title: 'ページ2',
          slug: 'page-2',
          view_count: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPages,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ eq: mockEq2 })
      mockEq2.mockReturnValue({ order: mockOrder })

      const result = await getWikiPageList()

      expect(result).toEqual({
        success: true,
        pages: mockPages,
      })
    })
  })

  describe('searchWikiPages', () => {
    it('組織が選択されていない場合、エラーを返す', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(null)

      const result = await searchWikiPages('検索キーワード')

      expect(result).toEqual({ error: 'No organization selected' })
    })

    it('Wikiページを検索できる', async () => {
      const { getCurrentOrganizationId } = await import('@/lib/organization/current')
      vi.mocked(getCurrentOrganizationId).mockResolvedValue(TEST_ORG_ID)

      const mockSearchResults = [
        {
          id: TEST_PAGE_ID,
          title: '検索結果1',
          slug: 'result-1',
          rank: 0.8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const result = await searchWikiPages('検索キーワード')

      expect(result).toEqual({
        success: true,
        pages: mockSearchResults,
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_wiki_pages', {
        org_id: TEST_ORG_ID,
        search_query: '検索キーワード',
        limit_count: 20,
      })
    })
  })
})
