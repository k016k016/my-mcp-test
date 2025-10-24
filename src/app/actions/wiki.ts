'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import type {
  CreateWikiPageData,
  UpdateWikiPageData,
  WikiPage,
  WikiPageListItem,
  WikiSearchResult,
} from '@/types/database'

/**
 * Wikiページを作成
 */
export async function createWikiPage(data: CreateWikiPageData) {
  try {
    console.log('[createWikiPage] Starting with data:', data)
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    console.log('[createWikiPage] User:', user?.id, 'Auth error:', authError)
    if (authError || !user) {
      console.error('[createWikiPage] Auth failed')
      return { error: 'Unauthorized' }
    }

    // 現在の組織を取得
    const organizationId = await getCurrentOrganizationId()
    console.log('[createWikiPage] Organization ID:', organizationId)
    if (!organizationId) {
      console.error('[createWikiPage] No organization ID')
      return { error: 'No organization selected' }
    }

    // ページを作成
    const insertData = {
      organization_id: organizationId,
      title: data.title,
      slug: data.slug,
      content: data.content,
      is_published: true,
      created_by: user.id,
      updated_by: user.id,
    }
    console.log('[createWikiPage] Inserting data:', insertData)

    const { data: page, error } = await supabase
      .from('wiki_pages')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[createWikiPage] Insert error:', error)
      return { error: `ページの作成に失敗しました: ${error.message}` }
    }

    console.log('[createWikiPage] Page created successfully:', page.id)

    revalidatePath('/wiki')
    revalidatePath(`/wiki/${data.slug}`)

    // 成功を返す（クライアント側で遷移）
    return { success: true, slug: data.slug, page }
  } catch (error) {
    console.error('[createWikiPage] Exception:', error)
    return {
      error: `ページの作成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Wikiページを更新
 */
export async function updateWikiPage(pageId: string, data: UpdateWikiPageData) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // 現在の組織を取得
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) {
      return { error: 'No organization selected' }
    }

    // ページを更新
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.content !== undefined) updateData.content = data.content

    const { data: page, error } = await supabase
      .from('wiki_pages')
      .update(updateData)
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('[updateWikiPage]', error)
      return { error: 'ページの更新に失敗しました' }
    }

    revalidatePath('/wiki')
    revalidatePath(`/wiki/${page.slug}`)

    return { success: true, page }
  } catch (error) {
    console.error('[updateWikiPage]', error)
    return { error: 'ページの更新に失敗しました' }
  }
}

/**
 * Wikiページを削除
 */
export async function deleteWikiPage(pageId: string) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // 現在の組織を取得
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) {
      return { error: 'No organization selected' }
    }

    // ページを削除
    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .eq('id', pageId)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('[deleteWikiPage]', error)
      return { error: 'ページの削除に失敗しました' }
    }

    revalidatePath('/wiki')

    return { success: true }
  } catch (error) {
    console.error('[deleteWikiPage]', error)
    return { error: 'ページの削除に失敗しました' }
  }
}

/**
 * Wikiページを取得（スラッグで検索）
 */
export async function getWikiPage(slug: string) {
  try {
    // 現在の組織を取得
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) {
      return { error: 'No organization selected' }
    }

    const supabase = await createClient()

    // ページを取得
    const { data: page, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (error) {
      console.error('[getWikiPage]', error)
      return { error: 'ページが見つかりません' }
    }

    // 閲覧数を増やす
    await supabase
      .from('wiki_pages')
      .update({ view_count: page.view_count + 1 })
      .eq('id', page.id)

    return { success: true, page }
  } catch (error) {
    console.error('[getWikiPage]', error)
    return { error: 'ページの取得に失敗しました' }
  }
}

/**
 * Wikiページ一覧を取得
 */
export async function getWikiPageList() {
  try {
    // 現在の組織を取得
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) {
      return { error: 'No organization selected' }
    }

    const supabase = await createClient()

    // ページ一覧を取得
    const { data: pages, error } = await supabase
      .from('wiki_pages')
      .select('id, title, slug, view_count, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('is_published', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[getWikiPageList]', error)
      return { error: 'ページ一覧の取得に失敗しました' }
    }

    return { success: true, pages: pages as WikiPageListItem[] }
  } catch (error) {
    console.error('[getWikiPageList]', error)
    return { error: 'ページ一覧の取得に失敗しました' }
  }
}

/**
 * Wikiページを検索
 */
export async function searchWikiPages(searchQuery: string, limitCount = 20) {
  try {
    // 現在の組織を取得
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) {
      return { error: 'No organization selected' }
    }

    const supabase = await createClient()

    // 全文検索RPC関数を呼び出す
    const { data: pages, error } = await supabase.rpc('search_wiki_pages', {
      org_id: organizationId,
      search_query: searchQuery,
      limit_count: limitCount,
    })

    if (error) {
      console.error('[searchWikiPages]', error)
      return { error: '検索に失敗しました' }
    }

    return { success: true, pages: pages as WikiSearchResult[] }
  } catch (error) {
    console.error('[searchWikiPages]', error)
    return { error: '検索に失敗しました' }
  }
}
