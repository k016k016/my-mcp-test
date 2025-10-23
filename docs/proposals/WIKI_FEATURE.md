# Wiki機能仕様書（草案）

> ⚠️ **注意:** この仕様はまだ確定していません。実装前に要件を再確認してください。

**作成日:** 2025-10-23
**ステータス:** 🔶 Draft（草案）
**想定実装時期:** 未定

---

## 概要

組織内での知識共有とドキュメント管理を支援するWiki機能の仕様書。
マルチテナントSaaSアーキテクチャに統合し、組織ごとに完全に分離されたWikiを提供する。

## スコープ

### ✅ 含まれるもの
- ページ作成・編集（Markdown形式）
- 階層構造によるページ管理
- PostgreSQL全文検索機能
- R2ストレージによるファイル管理
- 権限ベースのアクセス制御
- バージョン管理（編集履歴）

### ❌ 含まれないもの
- リアルタイム機能（WebSocket等）
- モバイル最適化（基本的なレスポンシブのみ）
- 外部API連携
- 高度な権限管理（将来の拡張）

## 技術スタック

### 検索エンジン
- **PostgreSQL全文検索**を使用
- `tsvector`と`tsquery`を活用した高速検索
- 日本語対応のため`pg_trgm`拡張機能も検討

### ファイルストレージ
- **R2ストレージ**を活用（既存の実装を流用）
- 画像・添付ファイルのアップロード
- 署名付きURLによる安全なファイル配信

### リアルタイム機能
- **不要** - シンプルなWiki機能に集中
- 将来的に必要になった場合はWebSocketで対応

### モバイル対応
- **後回し** - デスクトップファーストで実装
- 基本的なレスポンシブデザインは実装

## データベース設計

### テーブル構造

```sql
-- Wikiページテーブル（全文検索対応）
CREATE TABLE wiki_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 基本情報
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- 階層構造
    parent_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    
    -- メタデータ
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
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
    UNIQUE(organization_id, slug),
    UNIQUE(organization_id, path)
);

-- 全文検索用インデックス
CREATE INDEX idx_wiki_pages_search_vector ON wiki_pages USING gin(search_vector);
CREATE INDEX idx_wiki_pages_org_id ON wiki_pages(organization_id);
CREATE INDEX idx_wiki_pages_parent_id ON wiki_pages(parent_id);
CREATE INDEX idx_wiki_pages_path ON wiki_pages(organization_id, path);
CREATE INDEX idx_wiki_pages_slug ON wiki_pages(organization_id, slug);

-- 検索ベクターを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_wiki_page_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('japanese', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('japanese', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('japanese', COALESCE(NEW.summary, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wiki_pages_search_vector
    BEFORE INSERT OR UPDATE ON wiki_pages
    FOR EACH ROW EXECUTE FUNCTION update_wiki_page_search_vector();

-- Wiki添付ファイルテーブル（R2ストレージ対応）
CREATE TABLE wiki_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- ファイル情報
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    
    -- R2ストレージ情報
    r2_key TEXT NOT NULL, -- R2でのファイルキー
    r2_url TEXT, -- 公開URL（オプション）
    
    -- メタデータ
    description TEXT,
    is_image BOOLEAN NOT NULL DEFAULT false,
    
    -- 作成者
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wiki_attachments_page_id ON wiki_attachments(page_id);
CREATE INDEX idx_wiki_attachments_org_id ON wiki_attachments(organization_id);

-- Wikiページバージョン（履歴管理）
CREATE TABLE wiki_page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    
    -- バージョン情報
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- 変更情報
    change_reason TEXT, -- 変更理由
    changed_by UUID NOT NULL REFERENCES profiles(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(page_id, version_number)
);

-- Wikiコメント
CREATE TABLE wiki_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- コメント内容
    content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    
    -- 作成者
    created_by UUID NOT NULL REFERENCES profiles(id),
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wiki_page_versions_page_id ON wiki_page_versions(page_id);
CREATE INDEX idx_wiki_comments_page_id ON wiki_comments(page_id);
```

### RLSポリシー

```sql
-- WikiページのRLSポリシー
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
```

### 全文検索用のRPC関数

```sql
-- Wikiページの全文検索関数
CREATE OR REPLACE FUNCTION search_wiki_pages(
    org_id UUID,
    search_query TEXT,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    summary TEXT,
    path TEXT,
    rank REAL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    updated_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.id,
        wp.title,
        wp.slug,
        wp.summary,
        wp.path,
        ts_rank(wp.search_vector, plainto_tsquery('japanese', search_query)) as rank,
        wp.created_at,
        wp.updated_at,
        wp.created_by,
        wp.updated_by
    FROM wiki_pages wp
    WHERE wp.organization_id = org_id
        AND wp.is_published = true
        AND wp.search_vector @@ plainto_tsquery('japanese', search_query)
    ORDER BY rank DESC, wp.updated_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
```

## 権限管理

### 閲覧権限
- 組織メンバー全員が閲覧可能

### 編集権限
- `owner`/`admin`: 全ページの編集・削除可能
- `member`: 自分が作成したページのみ編集可能

### 管理権限
- `owner`/`admin`のみがページ削除・権限変更可能

## UI設計

### エディタ技術スタック
- **Monacoエディタ**: VS Codeと同じエディタエンジン
  - シンタックスハイライト
  - 自動補完
  - 検索・置換
  - 折りたたみ
  - マルチカーソル
  - リアルタイムプレビュー

### ページ構造
```
/app/wiki/
├── /                    # Wikiトップページ
├── /[slug]             # 個別ページ表示
├── /[slug]/edit        # ページ編集
├── /[slug]/history     # 編集履歴
├── /create            # 新規ページ作成
├── /search            # 検索結果
└── /settings          # Wiki設定（管理者のみ）
```

### 主要コンポーネント
- **WikiLayout**: サイドバーナビゲーション付きレイアウト
- **WikiPageList**: ページ一覧表示（階層構造）
- **WikiEditor**: Markdownエディタ（Monacoエディタ + リアルタイムプレビュー）
- **WikiSearch**: 全文検索機能
- **WikiComments**: コメント機能

## Server Actions

### 主要なServer Actions

```typescript
// src/app/actions/wiki.ts

export async function createWikiPage(data: CreateWikiPageData)
export async function updateWikiPage(id: string, data: UpdateWikiPageData)
export async function deleteWikiPage(id: string)
export async function getWikiPage(slug: string)
export async function getWikiPageList(parentId?: string)
export async function searchWikiPages(query: string)
export async function createWikiComment(pageId: string, content: string)
export async function getWikiPageHistory(pageId: string)
export async function uploadWikiAttachment(pageId: string, file: File, description?: string)
export async function getImageUrl(attachmentId: string)
```

## R2ストレージ統合

### ファイルアップロード機能

```typescript
// src/app/actions/wiki.ts
import { uploadFile, generatePresignedUploadUrl } from '@/lib/r2/operations'

export async function uploadWikiAttachment(
  pageId: string,
  file: File,
  description?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // 現在の組織を取得
  const orgId = await getCurrentOrganizationId()
  if (!orgId) {
    return { error: 'No organization selected' }
  }

  // ファイルサイズ制限（10MB）
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'ファイルサイズが大きすぎます（最大10MB）' }
  }

  // 許可されたファイルタイプ
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    return { error: 'サポートされていないファイルタイプです' }
  }

  try {
    // R2にアップロード
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const r2Key = `wiki/${orgId}/${pageId}/${Date.now()}-${file.name}`
    
    const { key, url } = await uploadFile(r2Key, fileBuffer, {
      contentType: file.type,
      metadata: {
        'original-filename': file.name,
        'uploaded-by': user.id,
        'page-id': pageId
      }
    })

    // データベースに記録
    const { data, error } = await supabase
      .from('wiki_attachments')
      .insert({
        page_id: pageId,
        organization_id: orgId,
        filename: file.name,
        original_filename: file.name,
        file_size: file.size,
        content_type: file.type,
        r2_key: key,
        r2_url: url,
        description,
        is_image: file.type.startsWith('image/'),
        uploaded_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, attachment: data }
  } catch (error) {
    console.error('[uploadWikiAttachment]', error)
    return { error: 'ファイルのアップロードに失敗しました' }
  }
}
```

### 画像表示用の署名付きURL

```typescript
// 画像表示用の署名付きURLを生成
export async function getImageUrl(attachmentId: string) {
  const supabase = await createClient()
  
  // 添付ファイル情報を取得
  const { data: attachment } = await supabase
    .from('wiki_attachments')
    .select('r2_key, content_type')
    .eq('id', attachmentId)
    .single()

  if (!attachment) {
    return { error: 'Attachment not found' }
  }

  // 署名付きURLを生成（1時間有効）
  const signedUrl = await generatePresignedUrl(attachment.r2_key, 3600)
  
  return { success: true, url: signedUrl }
}
```

## 実装計画

### Phase 1: 基本機能（推定6-8時間）
1. **データベーススキーマ作成**（2時間）
   - テーブル作成
   - 全文検索インデックス設定
   - RLSポリシー設定

2. **基本CRUD操作**（3時間）
   - ページ作成・編集・削除
   - 階層構造の実装
   - 権限チェック

3. **検索機能**（2時間）
   - PostgreSQL全文検索の実装
   - 検索結果の表示

4. **ファイルアップロード**（1時間）
   - R2ストレージ統合
   - 画像表示機能

### Phase 2: UI/UX（推定4-6時間）
1. **Wikiレイアウト**（2時間）
   - サイドバーナビゲーション
   - 階層表示

2. **エディタ機能**（2時間）
   - Markdownエディタ
   - リアルタイムプレビュー

3. **検索UI**（1時間）
   - 検索フォーム
   - 結果表示

4. **レスポンシブ対応**（1時間）
   - 基本的なモバイル対応

## 技術的考慮事項

### パフォーマンス最適化
- 全文検索インデックスの最適化
- ページネーション実装
- 画像の遅延読み込み

### セキュリティ
- XSS対策（Markdownサニタイズ）
- ファイルアップロード制限
- 組織間の完全分離

### 将来の拡張性
- プラグインシステムの基盤
- APIエンドポイントの準備
- テンプレート機能の拡張

## 未解決事項

### 1. Markdownエディタの選択
- Monaco Editor vs CodeMirror vs 独自実装
- リアルタイムプレビューの実装方法

### 2. 検索機能の詳細
- 日本語検索の精度向上
- 検索結果のランキングアルゴリズム

### 3. ファイル管理
- 画像の最適化（リサイズ、圧縮）
- ファイルのバージョン管理

### 4. 権限の細分化
- ページ単位の権限設定
- コメント権限の管理

## 実装見積もり

| 項目 | 時間 | 詳細 |
|------|------|------|
| データベーススキーマ | 2時間 | テーブル作成、インデックス、RLSポリシー |
| 基本CRUD操作 | 3時間 | Server Actions、権限チェック、階層構造 |
| 検索機能 | 2時間 | PostgreSQL全文検索、RPC関数、UI |
| ファイル管理 | 1時間 | R2ストレージ統合、画像表示 |
| Wikiレイアウト | 2時間 | サイドバー、階層表示、ナビゲーション |
| エディタ機能 | 2時間 | Markdownエディタ、プレビュー |
| 検索UI | 1時間 | 検索フォーム、結果表示 |
| レスポンシブ対応 | 1時間 | 基本的なモバイル対応 |
| **合計** | **14時間** | **⭐⭐⭐ 大規模（段階的実装推奨）** |

## 参考資料

- 既存実装: `src/lib/r2/` - R2ストレージクライアント
- データベーススキーマ: `docs/specifications/DATABASE_SCHEMA.md`
- 権限管理: `src/lib/auth/permissions.ts`
- マルチテナント設計: `docs/MULTI_DOMAIN_SETUP.md`

---

**次のステップ:**
1. 要件の最終確認（機能範囲、優先度）
2. 実装の段階的計画策定
3. Phase 1の実装開始
4. E2Eテストの設計
