-- RLSセキュリティ問題の修正
-- Supabaseの警告: RLSポリシーは存在するが、RLSが有効化されていない

-- 影響を受けるテーブルでRLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- 確認クエリ（コメントアウト）
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('organizations', 'organization_members', 'audit_logs', 'usage_limits');
