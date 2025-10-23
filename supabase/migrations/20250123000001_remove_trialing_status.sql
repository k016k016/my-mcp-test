-- トライアルステータスの完全削除
-- 実行日時: 2025-01-23
-- 理由: トライアル機能は使用しないため、'trialing'ステータスを完全に削除

-- 1. 既存の'trialing'ステータスを'active'に更新
UPDATE organizations
SET subscription_status = 'active'
WHERE subscription_status = 'trialing';

-- 2. subscription_status ENUMを再作成（'trialing'を除外）
-- 注意: ENUMから値を削除するには型を再作成する必要がある

-- デフォルト値を一時的に削除
ALTER TABLE organizations
  ALTER COLUMN subscription_status DROP DEFAULT;

-- 一時的な新しいENUM型を作成
CREATE TYPE subscription_status_new AS ENUM ('active', 'past_due', 'canceled', 'incomplete');

-- カラムの型を新しいENUMに変更
ALTER TABLE organizations
  ALTER COLUMN subscription_status TYPE subscription_status_new
  USING subscription_status::text::subscription_status_new;

-- 古いENUM型を削除
DROP TYPE subscription_status;

-- 新しいENUM型を元の名前にリネーム
ALTER TYPE subscription_status_new RENAME TO subscription_status;

-- 3. デフォルト値を'active'に設定
ALTER TABLE organizations
  ALTER COLUMN subscription_status SET DEFAULT 'active';

-- コメント更新
COMMENT ON COLUMN organizations.subscription_status IS 'サブスクリプションステータス（active/past_due/canceled/incomplete）。trialingは廃止。';
