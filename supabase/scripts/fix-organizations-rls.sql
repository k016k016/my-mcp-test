-- organizationsテーブルのRLSポリシーを修正
-- Supabase Dashboard > SQL Editor で実行してください

-- 既存のINSERTポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Anyone can create organizations" ON organizations;

-- 新しいINSERTポリシーを作成
-- 認証済みユーザーなら誰でも組織を作成できる
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- 確認: 現在のポリシー一覧を表示
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;
