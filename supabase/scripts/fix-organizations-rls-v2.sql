-- organizationsテーブルのRLSポリシーを修正 (V2)
-- Supabase Dashboard > SQL Editor で実行してください

-- 既存のINSERTポリシーを完全に削除
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- 新しいINSERTポリシーを作成（auth.role()を確認）
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- 確認: 現在のポリシー一覧を表示
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;
