# Wiki機能 MVP 実装仕様書

**作成日:** 2025-10-24
**ステータス:** ✅ 確定 - 実装中
**想定実装時間:** 4時間
**実装開始日:** 2025-10-24

---

## 概要

4時間で実装可能な最小限のWiki機能。基本的なページ作成・表示・編集・検索機能を提供し、組織内での知識共有を可能にする。

## スコープ

### ✅ 含まれるもの
- ページ作成・表示・編集（Markdown形式）
- 基本的な検索機能
- 組織内でのアクセス制御
- シンプルなUI

### ❌ 含まれないもの
- 階層構造（フラットなページ構造）
- ファイルアップロード
- バージョン管理
- コメント機能
- 高度な権限管理

## 実装計画（4時間）

### Phase 1: データベーススキーマ（30分）

#### 1.1 マイグレーションファイル作成
**ファイル:** `supabase/migrations/20250117000002_wiki_mvp.sql`

```sql
-- Wiki MVP用のテーブル（最小限）
CREATE TABLE wiki_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 基本情報
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- メタデータ
    is_published BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    
    -- 全文検索用（PostgreSQL）
    search_vector tsvector,
    
    -- 作成者・更新者
    created_by UUID NOT NULL REFERENCES profiles(id),
    updated_by UUID NOT NULL REFERENCES profiles(id),
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    UNIQUE(organization_id, slug)
);

-- インデックス
CREATE INDEX idx_wiki_pages_org_id ON wiki_pages(organization_id);
CREATE INDEX idx_wiki_pages_slug ON wiki_pages(organization_id, slug);
CREATE INDEX idx_wiki_pages_search_vector ON wiki_pages USING gin(search_vector);

-- 検索ベクターを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_wiki_page_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('japanese', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('japanese', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wiki_pages_search_vector
    BEFORE INSERT OR UPDATE ON wiki_pages
    FOR EACH ROW EXECUTE FUNCTION update_wiki_page_search_vector();

-- RLSポリシー
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wiki pages in their organization" ON wiki_pages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can create wiki pages in their organization" ON wiki_pages
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update their own wiki pages or admin can update any" ON wiki_pages
    FOR UPDATE USING (
        created_by = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND deleted_at IS NULL
        )
    );

CREATE POLICY "Admins can delete any wiki page" ON wiki_pages
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND deleted_at IS NULL
        )
    );

-- 全文検索用のRPC関数
CREATE OR REPLACE FUNCTION search_wiki_pages(
    org_id UUID,
    search_query TEXT,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    rank REAL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.id,
        wp.title,
        wp.slug,
        ts_rank(wp.search_vector, plainto_tsquery('japanese', search_query)) as rank,
        wp.created_at,
        wp.updated_at
    FROM wiki_pages wp
    WHERE wp.organization_id = org_id
        AND wp.is_published = true
        AND wp.search_vector @@ plainto_tsquery('japanese', search_query)
    ORDER BY rank DESC, wp.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: 型定義とServer Actions（1時間）

#### 2.0 依存関係の追加
```bash
npm install @monaco-editor/react
```

#### 2.1 型定義
**ファイル:** `src/types/database.ts`に追加

```typescript
export interface WikiPage {
  id: string
  organization_id: string
  title: string
  slug: string
  content: string
  is_published: boolean
  view_count: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface CreateWikiPageData {
  title: string
  slug: string
  content: string
}

export interface UpdateWikiPageData {
  title?: string
  slug?: string
  content?: string
}
```

#### 2.2 Server Actions
**ファイル:** `src/app/actions/wiki.ts`（新規作成）

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import { CreateWikiPageData, UpdateWikiPageData } from '@/types/database'

export async function createWikiPage(data: CreateWikiPageData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    const { data: page, error } = await supabase
      .from('wiki_pages')
      .insert({
        organization_id: orgId,
        title: data.title,
        slug: data.slug,
        content: data.content,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/app/wiki')
    return { success: true, page }
  } catch (error) {
    console.error('[createWikiPage]', error)
    return { error: 'ページの作成に失敗しました' }
  }
}

export async function updateWikiPage(id: string, data: UpdateWikiPageData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    const { data: page, error } = await supabase
      .from('wiki_pages')
      .update({
        ...data,
        updated_by: user.id
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/app/wiki')
    revalidatePath(`/app/wiki/${page.slug}`)
    return { success: true, page }
  } catch (error) {
    console.error('[updateWikiPage]', error)
    return { error: 'ページの更新に失敗しました' }
  }
}

export async function deleteWikiPage(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) throw error

    revalidatePath('/app/wiki')
    return { success: true }
  } catch (error) {
    console.error('[deleteWikiPage]', error)
    return { error: 'ページの削除に失敗しました' }
  }
}

export async function getWikiPage(slug: string) {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    const { data: page, error } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('slug', slug)
      .eq('organization_id', orgId)
      .eq('is_published', true)
      .single()

    if (error) throw error

    // 閲覧数を増加
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

export async function getWikiPageList() {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    const { data: pages, error } = await supabase
      .from('wiki_pages')
      .select('id, title, slug, created_at, updated_at, view_count')
      .eq('organization_id', orgId)
      .eq('is_published', true)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return { success: true, pages }
  } catch (error) {
    console.error('[getWikiPageList]', error)
    return { error: 'ページ一覧の取得に失敗しました' }
  }
}

export async function searchWikiPages(query: string) {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    const { data: pages, error } = await supabase
      .rpc('search_wiki_pages', {
        org_id: orgId,
        search_query: query,
        limit_count: 20
      })

    if (error) throw error

    return { success: true, pages }
  } catch (error) {
    console.error('[searchWikiPages]', error)
    return { error: '検索に失敗しました' }
  }
}
```

### Phase 3: 基本UI（2時間）

#### 3.1 Wikiレイアウト
**ファイル:** `src/app/app/wiki/layout.tsx`

```typescript
import Link from 'next/link'

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Wiki</h1>
            <Link
              href="/app/wiki/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              新しいページ
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
```

#### 3.2 Wikiトップページ
**ファイル:** `src/app/app/wiki/page.tsx`

```typescript
import { getWikiPageList } from '@/app/actions/wiki'
import Link from 'next/link'

export default async function WikiPage() {
  const result = await getWikiPageList()
  
  if (!result.success) {
    return <div className="text-red-600">エラー: {result.error}</div>
  }

  const pages = result.pages || []

  return (
    <div className="space-y-6">
      {pages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">まだページがありません</p>
          <Link
            href="/app/wiki/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            最初のページを作成
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/app/wiki/${page.slug}`}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {page.title}
              </h3>
              <div className="text-sm text-gray-500">
                更新: {new Date(page.updated_at).toLocaleDateString('ja-JP')}
                <span className="ml-4">閲覧数: {page.view_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 3.3 ページ表示
**ファイル:** `src/app/app/wiki/[slug]/page.tsx`

```typescript
import { getWikiPage } from '@/app/actions/wiki'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { slug: string }
}

export default async function WikiPageView({ params }: PageProps) {
  const result = await getWikiPage(params.slug)
  
  if (!result.success) {
    if (result.error === 'ページの取得に失敗しました') {
      notFound()
    }
    return <div className="text-red-600">エラー: {result.error}</div>
  }

  const page = result.page

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/app/wiki" className="text-blue-600 hover:underline">
          ← Wikiに戻る
        </Link>
      </div>
      
      <article className="bg-white p-8 rounded-lg shadow">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {page.title}
          </h1>
          <div className="text-sm text-gray-500">
            作成: {new Date(page.created_at).toLocaleDateString('ja-JP')}
            <span className="ml-4">更新: {new Date(page.updated_at).toLocaleDateString('ja-JP')}</span>
            <span className="ml-4">閲覧数: {page.view_count}</span>
          </div>
        </header>
        
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
      </article>
    </div>
  )
}
```

#### 3.4 ページ作成・編集（Monacoエディタ対応）
**ファイル:** `src/app/app/wiki/create/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createWikiPage } from '@/app/actions/wiki'
import { useRouter } from 'next/navigation'
import { WikiEditor } from '@/components/WikiEditor'

export default function CreateWikiPage() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await createWikiPage({
      title,
      slug,
      content
    })

    if (result.success) {
      router.push(`/app/wiki/${slug}`)
    } else {
      alert(result.error)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新しいページを作成</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL（スラッグ）
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: getting-started"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容（Markdown）
          </label>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <WikiEditor
              content={content}
              onChange={setContent}
              height="500px"
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '作成中...' : '作成'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}
```

**WikiEditorコンポーネント（新規作成）**
**ファイル:** `src/components/WikiEditor.tsx`

```typescript
'use client'

import { Editor } from '@monaco-editor/react'
import { useTheme } from 'next-themes'

interface WikiEditorProps {
  content: string
  onChange: (value: string) => void
  height?: string
}

export function WikiEditor({ content, onChange, height = '400px' }: WikiEditorProps) {
  const { theme } = useTheme()

  return (
    <Editor
      height={height}
      defaultLanguage="markdown"
      value={content}
      onChange={(value) => onChange(value || '')}
      theme={theme === 'dark' ? 'vs-dark' : 'light'}
      options={{
        minimap: { enabled: false },
        wordWrap: 'on',
        lineNumbers: 'on',
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        renderLineHighlight: 'none',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
      }}
    />
  )
}
```

### Phase 4: 検索機能（30分）

#### 4.1 検索ページ
**ファイル:** `src/app/app/wiki/search/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { searchWikiPages } from '@/app/actions/wiki'
import Link from 'next/link'

export default function WikiSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    const result = await searchWikiPages(query)
    
    if (result.success) {
      setResults(result.pages || [])
    } else {
      alert(result.error)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wiki検索</h1>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索キーワードを入力..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '検索中...' : '検索'}
          </button>
        </div>
      </form>
      
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">検索結果 ({results.length}件)</h2>
          {results.map((page) => (
            <Link
              key={page.id}
              href={`/app/wiki/${page.slug}`}
              className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {page.title}
              </h3>
              <div className="text-sm text-gray-500">
                更新: {new Date(page.updated_at).toLocaleDateString('ja-JP')}
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {query && results.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          検索結果が見つかりませんでした
        </div>
      )}
    </div>
  )
}
```

## 実装手順

### 1. データベースセットアップ（30分）
1. Supabase Dashboard → SQL Editor
2. マイグレーションファイルを実行
3. 動作確認

### 2. 型定義とServer Actions（1時間）
1. `src/types/database.ts`に型定義追加
2. `src/app/actions/wiki.ts`作成
3. 動作確認

### 3. 基本UI（2時間）
1. レイアウト作成
2. トップページ作成
3. ページ表示作成
4. ページ作成フォーム作成
5. 動作確認

### 4. 検索機能（30分）
1. 検索ページ作成
2. 動作確認

## 完成後の機能

- ✅ ページ作成・表示・編集
- ✅ 基本的な検索機能
- ✅ 組織内でのアクセス制御
- ✅ シンプルなUI

## 次のステップ（将来の拡張）

- 階層構造の実装
- ファイルアップロード機能
- バージョン管理
- コメント機能
- より高度なUI/UX

---

**合計実装時間: 4時間**
**完成度: 基本的なWiki機能として十分使用可能**
