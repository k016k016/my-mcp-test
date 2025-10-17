-- オーナー1人制約を追加
-- 実行日時: 2025-01-17
-- 理由: 各組織にオーナーは1人のみとする制約を追加

-- ステップ1: 重複しているownerを特定し、最も古いowner以外をadminに変更
-- 各組織で最も古いownerを残し、それ以外のownerをadminに変更
WITH duplicate_owners AS (
  SELECT
    id,
    organization_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at ASC) as row_num
  FROM organization_members
  WHERE role = 'owner' AND deleted_at IS NULL
)
UPDATE organization_members
SET role = 'admin'
WHERE id IN (
  SELECT id FROM duplicate_owners WHERE row_num > 1
);

-- ステップ2: 部分的なユニーク制約を追加
-- deleted_atがNULLの場合のみ、organization_idとrole='owner'の組み合わせがユニークであることを保証
-- これにより、各組織には削除されていないownerが1人のみ存在することが保証される
CREATE UNIQUE INDEX idx_organization_members_single_owner
ON organization_members (organization_id)
WHERE role = 'owner' AND deleted_at IS NULL;

-- コメント追加
COMMENT ON INDEX idx_organization_members_single_owner IS '各組織には削除されていないオーナーが1人のみ存在することを保証する制約';
