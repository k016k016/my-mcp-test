-- Supabaseのテストデータを全て削除するスクリプト
-- 警告: このスクリプトは開発/プレビュー環境でのみ使用してください
-- 本番環境では絶対に実行しないこと

-- 1. 外部キー制約のあるテーブルから順に削除

-- 監査ログを削除
DELETE FROM public.audit_logs;

-- 使用量トラッキングを削除
DELETE FROM public.usage_tracking;

-- 使用量制限を削除
DELETE FROM public.usage_limits;

-- 招待を削除
DELETE FROM public.invitations;

-- 組織メンバーを削除
DELETE FROM public.organization_members;

-- 組織を削除
DELETE FROM public.organizations;

-- プロフィールを削除
DELETE FROM public.profiles;

-- 2. 最後に認証ユーザーを削除（これで全てのauth関連データも削除される）
DELETE FROM auth.users;

-- 3. 確認: 全テーブルのレコード数を表示
SELECT 'audit_logs' as table_name, COUNT(*) as count FROM public.audit_logs
UNION ALL
SELECT 'usage_tracking', COUNT(*) FROM public.usage_tracking
UNION ALL
SELECT 'usage_limits', COUNT(*) FROM public.usage_limits
UNION ALL
SELECT 'invitations', COUNT(*) FROM public.invitations
UNION ALL
SELECT 'organization_members', COUNT(*) FROM public.organization_members
UNION ALL
SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users;
