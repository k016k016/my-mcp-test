-- trial_ends_atカラムを削除
-- 実行日時: 2025-01-17
-- 理由: トライアル期間は基本的に使用しないため、カラムを削除

-- organizationsテーブルからtrial_ends_atカラムを削除
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_ends_at;

-- コメント更新
COMMENT ON TABLE organizations IS '組織/テナント。マルチテナントの基本単位。トライアル期間は使用しない。';
