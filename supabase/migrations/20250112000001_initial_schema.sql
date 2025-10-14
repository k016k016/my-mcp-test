-- マルチテナントSaaSの初期スキーマ
-- 実行順序: このファイルをSupabaseのSQL Editorで実行してください

-- ============================================================================
-- 1. 拡張機能の有効化
-- ============================================================================

-- UUID生成用（Supabase Cloudではpgcryptoを使用）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- 不要
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PostGIS（位置情報）
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 2. ENUM型の定義
-- ============================================================================

-- 組織メンバーのロール
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');

-- サブスクリプションステータス
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

-- サブスクリプションプラン
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');

-- 招待ステータス
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- ============================================================================
-- 3. テーブル定義
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Organizations（組織/テナント）
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL用の一意な識別子（例: acme-corp）

    -- サブスクリプション情報
    subscription_plan subscription_plan NOT NULL DEFAULT 'free',
    subscription_status subscription_status NOT NULL DEFAULT 'trialing',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,

    -- Chargebee関連
    chargebee_customer_id TEXT,
    chargebee_subscription_id TEXT,

    -- メタデータ
    metadata JSONB DEFAULT '{}'::jsonb,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_chargebee_customer_id ON organizations(chargebee_customer_id);

-- ----------------------------------------------------------------------------
-- 3.2 Profiles（ユーザープロフィール）
-- Supabase Authのusersテーブルを拡張
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,

    -- メタデータ
    metadata JSONB DEFAULT '{}'::jsonb,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_profiles_email ON profiles(email);

-- ----------------------------------------------------------------------------
-- 3.3 OrganizationMembers（組織メンバー）
-- 組織とユーザーの多対多の関係
-- ----------------------------------------------------------------------------
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role organization_role NOT NULL DEFAULT 'member',

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 一意制約: 1ユーザーは1組織に1回のみ所属
    UNIQUE(organization_id, user_id)
);

-- インデックス
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);

-- ----------------------------------------------------------------------------
-- 3.4 Invitations（招待）
-- ----------------------------------------------------------------------------
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role organization_role NOT NULL DEFAULT 'member',
    status invitation_status NOT NULL DEFAULT 'pending',
    token TEXT UNIQUE NOT NULL, -- 招待トークン
    invited_by UUID NOT NULL REFERENCES profiles(id),

    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_invitations_org_id ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- ----------------------------------------------------------------------------
-- 3.5 AuditLogs（監査ログ）
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    action TEXT NOT NULL, -- 例: 'user.created', 'subscription.updated'
    resource_type TEXT NOT NULL, -- 例: 'user', 'organization', 'subscription'
    resource_id TEXT,

    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3.6 UsageLimits（使用量制限）
-- プランごとの制限を管理
-- ----------------------------------------------------------------------------
CREATE TABLE usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan subscription_plan NOT NULL UNIQUE,

    -- 制限値（-1は無制限）
    max_members INTEGER NOT NULL DEFAULT 5,
    max_projects INTEGER NOT NULL DEFAULT 10,
    max_storage_gb INTEGER NOT NULL DEFAULT 5,
    max_api_calls_per_month INTEGER NOT NULL DEFAULT 10000,

    features JSONB DEFAULT '{}'::jsonb, -- 利用可能な機能のリスト

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デフォルトの使用量制限を挿入
INSERT INTO usage_limits (plan, max_members, max_projects, max_storage_gb, max_api_calls_per_month, features) VALUES
('free', 3, 5, 1, 1000, '{"analytics": false, "api_access": false, "priority_support": false}'::jsonb),
('pro', 10, 50, 100, 100000, '{"analytics": true, "api_access": true, "priority_support": false}'::jsonb),
('enterprise', -1, -1, -1, -1, '{"analytics": true, "api_access": true, "priority_support": true, "custom_domain": true}'::jsonb);

-- ----------------------------------------------------------------------------
-- 3.7 UsageTracking（使用量追跡）
-- 組織ごとの使用量を記録
-- ----------------------------------------------------------------------------
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- 期間（月次）
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- 使用量
    members_count INTEGER DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    storage_used_gb DECIMAL(10, 2) DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, period_start)
);

-- インデックス
CREATE INDEX idx_usage_tracking_org_id ON usage_tracking(organization_id);
CREATE INDEX idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- ============================================================================
-- 4. 関数とトリガー
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 updated_atを自動更新する関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを各テーブルに適用
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON usage_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.2 新規ユーザー登録時にプロフィールを自動作成
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガー
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. コメント（ドキュメント）
-- ============================================================================

COMMENT ON TABLE organizations IS '組織/テナント。マルチテナントの基本単位。';
COMMENT ON TABLE profiles IS 'ユーザープロフィール。auth.usersを拡張。';
COMMENT ON TABLE organization_members IS '組織とユーザーの多対多の関係。ロール管理。';
COMMENT ON TABLE invitations IS '組織への招待。';
COMMENT ON TABLE audit_logs IS '監査ログ。全てのアクションを記録。';
COMMENT ON TABLE usage_limits IS 'プランごとの使用量制限。';
COMMENT ON TABLE usage_tracking IS '組織ごとの使用量追跡（月次）。';

COMMENT ON COLUMN organizations.slug IS 'URL用の一意な識別子（例: acme-corp）';
COMMENT ON COLUMN organizations.subscription_plan IS 'サブスクリプションプラン（free, pro, enterprise）';
COMMENT ON COLUMN organizations.trial_ends_at IS 'トライアル期間終了日時';
