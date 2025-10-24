-- 包括的なWiki関連オブジェクトのクリーンアップとSimple設定での再作成

-- STEP 1: すべての依存関係を強制削除
DO $$
DECLARE
    r RECORD;
BEGIN
    -- すべてのwiki_pagesテーブル関連のトリガーを削除
    FOR r IN (SELECT tgname FROM pg_trigger WHERE tgrelid = 'wiki_pages'::regclass) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.tgname || ' ON wiki_pages CASCADE';
    END LOOP;

    -- すべてのwiki関連関数を削除（署名に関係なく）
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname LIKE '%wiki%') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- テーブルを削除
DROP TABLE IF EXISTS wiki_pages CASCADE;

-- STEP 2: Simple設定でテーブルを再作成
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

-- STEP 3: Simple設定の検索ベクター更新関数を作成
CREATE OR REPLACE FUNCTION update_wiki_page_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- IMPORTANT: 'simple'設定を使用（Supabaseで利用可能）
    NEW.search_vector =
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER update_wiki_pages_search_vector
    BEFORE INSERT OR UPDATE ON wiki_pages
    FOR EACH ROW EXECUTE FUNCTION update_wiki_page_search_vector();

-- STEP 4: RLSポリシー
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

-- STEP 5: Simple設定の全文検索RPC関数
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
    -- IMPORTANT: 'simple'設定を使用（Supabaseで利用可能）
    RETURN QUERY
    SELECT
        wp.id,
        wp.title,
        wp.slug,
        ts_rank(wp.search_vector, plainto_tsquery('simple', search_query)) as rank,
        wp.created_at,
        wp.updated_at
    FROM wiki_pages wp
    WHERE wp.organization_id = org_id
        AND wp.is_published = true
        AND wp.search_vector @@ plainto_tsquery('simple', search_query)
    ORDER BY rank DESC, wp.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 確認用: 関数とトリガーが正しく作成されたことを確認
DO $$
BEGIN
    RAISE NOTICE '✅ Wiki tables, triggers, and functions created successfully with SIMPLE configuration';
END $$;
