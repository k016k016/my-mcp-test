-- Wiki権限設定の変更
-- 編集: 組織メンバー全員が可能
-- 削除: 作成者 or 管理者のみ

-- 既存のUPDATEポリシーを削除
DROP POLICY IF EXISTS "Users can update their own wiki pages or admin can update any" ON wiki_pages;

-- 新しいUPDATEポリシーを作成（全メンバーが編集可能）
CREATE POLICY "All members can update wiki pages in their organization" ON wiki_pages
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- 既存のDELETEポリシーを削除
DROP POLICY IF EXISTS "Admins can delete any wiki page" ON wiki_pages;

-- 新しいDELETEポリシーを作成（作成者 or 管理者）
CREATE POLICY "Creator or admins can delete wiki pages" ON wiki_pages
    FOR DELETE USING (
        created_by = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND deleted_at IS NULL
        )
    );
