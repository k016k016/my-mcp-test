-- Row Level Security (RLS) ポリシー
-- マルチテナントSaaSのセキュリティ設定

-- ============================================================================
-- 1. RLSの有効化
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ヘルパー関数
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 現在のユーザーIDを取得
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2.2 ユーザーが所属する組織IDのリストを取得
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.user_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2.3 ユーザーが組織のメンバーかチェック
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2.4 ユーザーの組織内ロールを取得
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS organization_role AS $$
BEGIN
    RETURN (
        SELECT role
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2.5 ユーザーが組織のオーナーまたは管理者かチェック
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.user_id()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Organizationsテーブルのポリシー
-- ============================================================================

-- SELECT: 自分が所属する組織のみ閲覧可能
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    TO authenticated
    USING (id IN (SELECT get_user_organizations()));

-- INSERT: 認証済みユーザーなら組織を作成可能
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: 組織のオーナーまたは管理者のみ更新可能
CREATE POLICY "Admins can update their organizations"
    ON organizations FOR UPDATE
    TO authenticated
    USING (is_organization_admin(id))
    WITH CHECK (is_organization_admin(id));

-- DELETE: 組織のオーナーのみ削除可能
CREATE POLICY "Owners can delete their organizations"
    ON organizations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM organization_members
            WHERE organization_id = id
            AND user_id = auth.user_id()
            AND role = 'owner'
        )
    );

-- ============================================================================
-- 4. Profilesテーブルのポリシー
-- ============================================================================

-- SELECT: 全員が全プロフィールを閲覧可能（公開情報のため）
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: 自分のプロフィールのみ作成可能
CREATE POLICY "Users can create their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.user_id());

-- UPDATE: 自分のプロフィールのみ更新可能
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.user_id())
    WITH CHECK (id = auth.user_id());

-- ============================================================================
-- 5. OrganizationMembersテーブルのポリシー
-- ============================================================================

-- SELECT: 自分が所属する組織のメンバー情報のみ閲覧可能
CREATE POLICY "Users can view members of their organizations"
    ON organization_members FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT get_user_organizations()));

-- INSERT: 組織の管理者のみメンバーを追加可能
CREATE POLICY "Admins can add members"
    ON organization_members FOR INSERT
    TO authenticated
    WITH CHECK (is_organization_admin(organization_id));

-- UPDATE: 組織の管理者のみメンバー情報を更新可能
CREATE POLICY "Admins can update members"
    ON organization_members FOR UPDATE
    TO authenticated
    USING (is_organization_admin(organization_id))
    WITH CHECK (is_organization_admin(organization_id));

-- DELETE: 組織の管理者のみメンバーを削除可能、または自分自身は退出可能
CREATE POLICY "Admins can remove members or users can leave"
    ON organization_members FOR DELETE
    TO authenticated
    USING (
        is_organization_admin(organization_id)
        OR user_id = auth.user_id()
    );

-- ============================================================================
-- 6. Invitationsテーブルのポリシー
-- ============================================================================

-- SELECT: 組織の管理者、または招待されたメールアドレスの本人のみ閲覧可能
CREATE POLICY "Admins and invitees can view invitations"
    ON invitations FOR SELECT
    TO authenticated
    USING (
        is_organization_admin(organization_id)
        OR email = (SELECT email FROM profiles WHERE id = auth.user_id())
    );

-- INSERT: 組織の管理者のみ招待を作成可能
CREATE POLICY "Admins can create invitations"
    ON invitations FOR INSERT
    TO authenticated
    WITH CHECK (is_organization_admin(organization_id));

-- UPDATE: 組織の管理者、または招待された本人のみ更新可能
CREATE POLICY "Admins and invitees can update invitations"
    ON invitations FOR UPDATE
    TO authenticated
    USING (
        is_organization_admin(organization_id)
        OR email = (SELECT email FROM profiles WHERE id = auth.user_id())
    )
    WITH CHECK (
        is_organization_admin(organization_id)
        OR email = (SELECT email FROM profiles WHERE id = auth.user_id())
    );

-- DELETE: 組織の管理者のみ招待を削除可能
CREATE POLICY "Admins can delete invitations"
    ON invitations FOR DELETE
    TO authenticated
    USING (is_organization_admin(organization_id));

-- ============================================================================
-- 7. AuditLogsテーブルのポリシー
-- ============================================================================

-- SELECT: 組織の管理者のみ閲覧可能
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (is_organization_admin(organization_id));

-- INSERT: 認証済みユーザーなら追加可能（システムが自動追加）
CREATE POLICY "Authenticated users can create audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT get_user_organizations()));

-- UPDATE, DELETE: 不可（監査ログは不変）

-- ============================================================================
-- 8. UsageTrackingテーブルのポリシー
-- ============================================================================

-- SELECT: 組織のメンバーなら閲覧可能
CREATE POLICY "Members can view usage tracking"
    ON usage_tracking FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT get_user_organizations()));

-- INSERT, UPDATE: システムのみ（サービスロールキー使用）
-- DELETE: 不可

-- ============================================================================
-- 9. コメント
-- ============================================================================

COMMENT ON FUNCTION is_organization_member IS 'ユーザーが組織のメンバーかチェック';
COMMENT ON FUNCTION is_organization_admin IS 'ユーザーが組織のオーナーまたは管理者かチェック';
COMMENT ON FUNCTION get_user_organizations IS 'ユーザーが所属する組織IDのリストを取得';
COMMENT ON FUNCTION get_user_role IS 'ユーザーの組織内ロールを取得';
