-- slug列をorganizationsテーブルから削除
-- slug列はURL識別用に設計されていたが、現在のアーキテクチャでは使用されていない
-- Cookie/セッションベースの組織識別を採用しているため不要

-- インデックスを削除
DROP INDEX IF EXISTS idx_organizations_slug;

-- slug列を削除
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;

-- コメント: この変更により、organizationsテーブルはよりシンプルになります
COMMENT ON TABLE organizations IS 'Organization table without slug - using UUID-based identification via cookies';
