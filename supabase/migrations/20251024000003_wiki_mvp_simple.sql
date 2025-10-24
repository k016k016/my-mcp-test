-- Wiki MVP用のテーブル（最小限）- simple設定版
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
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B');
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
