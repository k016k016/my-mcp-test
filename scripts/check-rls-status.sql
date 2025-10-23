-- RLS有効化状態を確認
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity = true THEN '✅ 有効'
    ELSE '❌ 無効'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'organizations',
  'organization_members',
  'audit_logs',
  'usage_limits',
  'profiles',
  'invitations',
  'usage_tracking'
)
ORDER BY tablename;
