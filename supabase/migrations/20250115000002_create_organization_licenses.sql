-- organization_licensesテーブルの作成
-- B2B企業向けライセンス管理
-- Migration: 20250115000002_create_organization_licenses.sql

-- organization_licensesテーブルを作成
CREATE TABLE IF NOT EXISTS public.organization_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,

  -- プラン情報
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'business', 'pro', 'enterprise')),
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  used_seats INTEGER NOT NULL DEFAULT 0 CHECK (used_seats >= 0),

  -- 決済プロバイダー情報
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  chargebee_customer_id TEXT,
  chargebee_subscription_id TEXT,

  -- 契約期間
  contract_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contract_end TIMESTAMPTZ,

  -- ステータス
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_organization_licenses_organization_id
  ON public.organization_licenses(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_licenses_plan_type
  ON public.organization_licenses(plan_type);

CREATE INDEX IF NOT EXISTS idx_organization_licenses_is_active
  ON public.organization_licenses(is_active);

-- RLS（Row Level Security）を有効化
ALTER TABLE public.organization_licenses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分が所属する組織のライセンスのみ閲覧可能
CREATE POLICY "Users can view licenses of their organizations"
  ON public.organization_licenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_licenses.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- RLSポリシー: Ownerのみがライセンス情報を更新可能
CREATE POLICY "Owners can update licenses"
  ON public.organization_licenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_licenses.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  );

-- RLSポリシー: システムのみがライセンスを作成可能（サービスロールキー使用）
CREATE POLICY "Service role can insert licenses"
  ON public.organization_licenses
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- トリガー関数: used_seatsを自動更新
CREATE OR REPLACE FUNCTION public.update_license_used_seats()
RETURNS TRIGGER AS $$
BEGIN
  -- organization_membersテーブルの変更があった組織のused_seatsを更新
  UPDATE public.organization_licenses
  SET
    used_seats = (
      SELECT COUNT(*)
      FROM public.organization_members
      WHERE organization_members.organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
    ),
    updated_at = NOW()
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー: メンバー追加時にused_seatsを更新
CREATE TRIGGER trigger_update_used_seats_on_member_insert
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_license_used_seats();

-- トリガー: メンバー削除時にused_seatsを更新
CREATE TRIGGER trigger_update_used_seats_on_member_delete
AFTER DELETE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_license_used_seats();

-- トリガー: updated_atを自動更新
CREATE OR REPLACE FUNCTION public.update_organization_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_licenses_updated_at
BEFORE UPDATE ON public.organization_licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_organization_licenses_updated_at();

-- コメントを追加
COMMENT ON TABLE public.organization_licenses IS 'B2B企業向けライセンス管理テーブル';
COMMENT ON COLUMN public.organization_licenses.plan_type IS 'プランタイプ (starter, business, pro, enterprise)';
COMMENT ON COLUMN public.organization_licenses.total_seats IS '契約シート数';
COMMENT ON COLUMN public.organization_licenses.used_seats IS '使用中シート数（自動計算）';
COMMENT ON COLUMN public.organization_licenses.stripe_customer_id IS 'Stripe顧客ID';
COMMENT ON COLUMN public.organization_licenses.stripe_subscription_id IS 'StripeサブスクリプションID';
COMMENT ON COLUMN public.organization_licenses.chargebee_customer_id IS 'Chargebee顧客ID';
COMMENT ON COLUMN public.organization_licenses.chargebee_subscription_id IS 'ChargebeeサブスクリプションID';
COMMENT ON COLUMN public.organization_licenses.contract_start IS '契約開始日';
COMMENT ON COLUMN public.organization_licenses.contract_end IS '契約終了日（null = 継続中）';
COMMENT ON COLUMN public.organization_licenses.is_active IS 'ライセンスが有効かどうか';
