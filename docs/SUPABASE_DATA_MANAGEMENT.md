# Supabaseデータ管理

このドキュメントでは、Supabaseのテストデータをクリアする方法を説明します。

## テストデータを全削除する方法

開発中に頻繁にデータをリセットしたい場合、以下の3つの方法があります。

### 方法1: npmコマンド（推奨）

```bash
npm run supabase:clear
```

このコマンドは:
1. 警告メッセージを表示
2. SQLファイルを自動的に開く
3. Supabase SQL Editorで実行できる状態にする

### 方法2: SQLファイルを直接開く

1. `supabase/scripts/clear-all-data.sql` をテキストエディタで開く
2. 内容をコピー
3. Supabaseダッシュボード → SQL Editor → 新規クエリ
4. ペーストして実行

### 方法3: Supabaseダッシュボードから直接実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 左メニュー「SQL Editor」をクリック
4. 以下のSQLをコピー&ペーストして実行:

```sql
-- 監査ログを削除
DELETE FROM public.audit_logs;

-- 使用量トラッキングを削除
DELETE FROM public.usage_tracking;

-- 使用量制限を削除
DELETE FROM public.usage_limits;

-- 招待を削除
DELETE FROM public.invitations;

-- 組織メンバーを削除
DELETE FROM public.organization_members;

-- 組織を削除
DELETE FROM public.organizations;

-- プロフィールを削除
DELETE FROM public.profiles;

-- 認証ユーザーを削除
DELETE FROM auth.users;

-- 確認
SELECT 'audit_logs' as table_name, COUNT(*) as count FROM public.audit_logs
UNION ALL SELECT 'usage_tracking', COUNT(*) FROM public.usage_tracking
UNION ALL SELECT 'usage_limits', COUNT(*) FROM public.usage_limits
UNION ALL SELECT 'invitations', COUNT(*) FROM public.invitations
UNION ALL SELECT 'organization_members', COUNT(*) FROM public.organization_members
UNION ALL SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users;
```

## 削除順序の重要性

テーブルは外部キー制約に従って以下の順序で削除する必要があります:

1. **audit_logs** - 他のテーブルを参照
2. **usage_tracking** - organization_idを参照
3. **usage_limits** - organization_idを参照
4. **invitations** - organization_idを参照
5. **organization_members** - user_idとorganization_idを参照
6. **organizations** - 多くのテーブルから参照される
7. **profiles** - user_idを参照
8. **auth.users** - 全ての基盤となるユーザーデータ

## 注意事項

⚠️ **警告**:
- このスクリプトは**開発環境とPreview環境でのみ**使用してください
- **本番環境では絶対に実行しないこと**
- データは完全に削除され、復元できません
- 実行前に必ずバックアップを取ることを推奨します

## 使用例

### 開発中のテストデータリセット

```bash
# 1. テストデータをクリア
npm run supabase:clear
# → SQLファイルが開くので、Supabase SQL Editorにコピー&ペースト

# 2. 開発サーバーを起動
npm run dev

# 3. 新しいユーザーで登録テスト
# http://localhost:3000 → サインアップ
```

### Preview環境のデータリセット

Preview環境（cocktailorder.com）のデータをリセットする場合も同じSQLを使用します:

1. Supabaseダッシュボードでプロジェクトを選択
2. 環境がPreview用のプロジェクトであることを確認
3. SQL Editorで `supabase/scripts/clear-all-data.sql` を実行

## データ確認

削除後、全テーブルが空になっているか確認:

```sql
SELECT 'audit_logs' as table_name, COUNT(*) as count FROM public.audit_logs
UNION ALL SELECT 'usage_tracking', COUNT(*) FROM public.usage_tracking
UNION ALL SELECT 'usage_limits', COUNT(*) FROM public.usage_limits
UNION ALL SELECT 'invitations', COUNT(*) FROM public.invitations
UNION ALL SELECT 'organization_members', COUNT(*) FROM public.organization_members
UNION ALL SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users;
```

全てのカウントが `0` であれば成功です。
