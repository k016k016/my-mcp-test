-- B2B企業向けフィールドをprofilesテーブルに追加
-- Migration: 20250115000001_add_b2b_fields_to_profiles.sql

-- profilesテーブルにcompany_nameとnameカラムを追加
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS name TEXT;

-- インデックスを作成（検索パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);

-- コメントを追加
COMMENT ON COLUMN public.profiles.company_name IS 'B2B企業向け: 会社名（サインアップ時に入力）';
COMMENT ON COLUMN public.profiles.name IS 'B2B企業向け: 担当者名（サインアップ時に入力）';
