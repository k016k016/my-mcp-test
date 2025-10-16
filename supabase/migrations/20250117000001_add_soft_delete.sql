-- 論理削除（ソフトデリート）機能の追加
-- 実行日: 2025-01-17

-- ============================================================================
-- 1. organization_membersテーブルにdeleted_atカラムを追加
-- ============================================================================

ALTER TABLE organization_members
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN organization_members.deleted_at IS '論理削除日時。NULLでない場合は削除済み。';

-- deleted_atが設定されているレコードを除外するためのインデックス
CREATE INDEX idx_organization_members_deleted_at ON organization_members(deleted_at)
WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 2. profilesテーブルにdeleted_atカラムを追加（将来のため）
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN profiles.deleted_at IS '論理削除日時。NULLでない場合は削除済み。';

-- deleted_atが設定されているレコードを除外するためのインデックス
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at)
WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 3. 使用例のコメント
-- ============================================================================

-- 論理削除の実行:
-- UPDATE organization_members SET deleted_at = NOW() WHERE id = 'xxx';
--
-- 削除済みを除外したクエリ:
-- SELECT * FROM organization_members WHERE deleted_at IS NULL;
--
-- 削除済みのみを取得:
-- SELECT * FROM organization_members WHERE deleted_at IS NOT NULL;
--
-- 論理削除を取り消し（復元）:
-- UPDATE organization_members SET deleted_at = NULL WHERE id = 'xxx';
