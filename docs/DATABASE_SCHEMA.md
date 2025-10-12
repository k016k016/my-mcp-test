# データベーススキーマドキュメント

マルチテナントSaaSのデータベース構造を説明します。

## 📊 概要

このスキーマは、**マルチテナント**アーキテクチャを実装しています。各組織（Organization）が独立したテナントとして機能し、Row Level Security（RLS）によってデータの分離が保証されます。

## 🗂️ テーブル一覧

### コアテーブル
1. **Organizations** - 組織/テナント
2. **Profiles** - ユーザープロフィール
3. **OrganizationMembers** - 組織メンバーシップ

### 管理テーブル
4. **Invitations** - 招待管理
5. **AuditLogs** - 監査ログ
6. **UsageLimits** - 使用量制限
7. **UsageTracking** - 使用量追跡

---

## 📋 詳細仕様

### 1. Organizations（組織/テナント）

マルチテナントの基本単位。各組織は独立したワークスペースを持ちます。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| name | TEXT | 組織名 |
| slug | TEXT | URL用の一意な識別子（例: acme-corp） |
| subscription_plan | ENUM | サブスクリプションプラン（free/pro/enterprise） |
| subscription_status | ENUM | ステータス（active/trialing/past_due/canceled） |
| trial_ends_at | TIMESTAMP | トライアル期間終了日時 |
| subscription_ends_at | TIMESTAMP | サブスクリプション終了日時 |
| chargebee_customer_id | TEXT | Chargebee顧客ID |
| chargebee_subscription_id | TEXT | ChargebeeサブスクリプションID |
| metadata | JSONB | 追加メタデータ |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**インデックス：**
- `slug` (UNIQUE)
- `chargebee_customer_id`

**RLSポリシー：**
- SELECT: 自分が所属する組織のみ閲覧可能
- INSERT: 認証済みユーザーなら作成可能
- UPDATE: 組織のオーナー/管理者のみ更新可能
- DELETE: 組織のオーナーのみ削除可能

---

### 2. Profiles（ユーザープロフィール）

Supabase Authの`auth.users`テーブルを拡張したプロフィール情報。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー（auth.users.idを参照） |
| email | TEXT | メールアドレス |
| full_name | TEXT | フルネーム |
| avatar_url | TEXT | アバター画像URL |
| metadata | JSONB | 追加メタデータ |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**RLSポリシー：**
- SELECT: 全員閲覧可能（公開情報）
- INSERT: 自分のプロフィールのみ作成可能
- UPDATE: 自分のプロフィールのみ更新可能

**自動処理：**
- 新規ユーザー登録時、トリガーで自動的にプロフィールが作成されます

---

### 3. OrganizationMembers（組織メンバーシップ）

組織とユーザーの多対多の関係を管理。ロールベースのアクセス制御（RBAC）を実装。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| organization_id | UUID | 組織ID |
| user_id | UUID | ユーザーID |
| role | ENUM | ロール（owner/admin/member） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**ロールの権限：**

| 権限 | owner | admin | member |
|------|-------|-------|--------|
| 組織情報の閲覧 | ✅ | ✅ | ✅ |
| 組織情報の編集 | ✅ | ✅ | ❌ |
| 組織の削除 | ✅ | ❌ | ❌ |
| メンバーの招待 | ✅ | ✅ | ❌ |
| メンバーの削除 | ✅ | ✅ | ❌ |
| ロールの変更 | ✅ | ✅ | ❌ |
| 請求情報の管理 | ✅ | ❌ | ❌ |
| 監査ログの閲覧 | ✅ | ✅ | ❌ |

**制約：**
- UNIQUE(organization_id, user_id) - 1ユーザーは1組織に1回のみ所属

**RLSポリシー：**
- SELECT: 自分が所属する組織のメンバー情報のみ閲覧可能
- INSERT: 組織の管理者のみ追加可能
- UPDATE: 組織の管理者のみ更新可能
- DELETE: 組織の管理者のみ削除可能、または自分自身は退出可能

---

### 4. Invitations（招待）

組織へのメンバー招待を管理。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| organization_id | UUID | 組織ID |
| email | TEXT | 招待先メールアドレス |
| role | ENUM | 招待時のロール |
| status | ENUM | ステータス（pending/accepted/expired） |
| token | TEXT | 招待トークン（UNIQUE） |
| invited_by | UUID | 招待者のユーザーID |
| expires_at | TIMESTAMP | 有効期限（デフォルト7日） |
| accepted_at | TIMESTAMP | 承認日時 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**RLSポリシー：**
- SELECT: 組織の管理者または招待された本人のみ閲覧可能
- INSERT: 組織の管理者のみ作成可能
- UPDATE: 組織の管理者または招待された本人のみ更新可能
- DELETE: 組織の管理者のみ削除可能

---

### 5. AuditLogs（監査ログ）

全てのアクションを記録。コンプライアンスとセキュリティのため。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| organization_id | UUID | 組織ID |
| user_id | UUID | ユーザーID（NULL可能） |
| action | TEXT | アクション名（例: user.created） |
| resource_type | TEXT | リソースタイプ（例: user, organization） |
| resource_id | TEXT | リソースID |
| details | JSONB | 詳細情報 |
| ip_address | INET | IPアドレス |
| user_agent | TEXT | ユーザーエージェント |
| created_at | TIMESTAMP | 作成日時 |

**アクション例：**
- `user.created` - ユーザー作成
- `user.updated` - ユーザー更新
- `user.deleted` - ユーザー削除
- `organization.created` - 組織作成
- `organization.updated` - 組織更新
- `subscription.updated` - サブスクリプション更新
- `member.invited` - メンバー招待
- `member.joined` - メンバー参加
- `member.removed` - メンバー削除

**RLSポリシー：**
- SELECT: 組織の管理者のみ閲覧可能
- INSERT: 認証済みユーザーなら追加可能（システムが自動追加）
- UPDATE/DELETE: 不可（監査ログは不変）

---

### 6. UsageLimits（使用量制限）

プランごとの使用量制限を定義。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| plan | ENUM | プラン（free/pro/enterprise） |
| max_members | INTEGER | 最大メンバー数（-1は無制限） |
| max_projects | INTEGER | 最大プロジェクト数 |
| max_storage_gb | INTEGER | 最大ストレージ（GB） |
| max_api_calls_per_month | INTEGER | 月間最大API呼び出し数 |
| features | JSONB | 利用可能な機能 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**デフォルト値：**

| プラン | メンバー | プロジェクト | ストレージ | API呼び出し | 機能 |
|--------|----------|--------------|------------|-------------|------|
| Free | 3 | 5 | 1GB | 1,000/月 | 基本機能のみ |
| Pro | 10 | 50 | 100GB | 100,000/月 | 分析、API |
| Enterprise | 無制限 | 無制限 | 無制限 | 無制限 | 全機能 |

---

### 7. UsageTracking（使用量追跡）

組織ごとの実際の使用量を月次で記録。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| organization_id | UUID | 組織ID |
| period_start | DATE | 期間開始日 |
| period_end | DATE | 期間終了日 |
| members_count | INTEGER | メンバー数 |
| projects_count | INTEGER | プロジェクト数 |
| storage_used_gb | DECIMAL | 使用ストレージ（GB） |
| api_calls_count | INTEGER | API呼び出し数 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**制約：**
- UNIQUE(organization_id, period_start) - 1組織1ヶ月に1レコード

**RLSポリシー：**
- SELECT: 組織のメンバーなら閲覧可能
- INSERT/UPDATE: システムのみ（サービスロールキー使用）

---

## 🔐 Row Level Security (RLS)

### ヘルパー関数

RLSポリシーで使用する便利な関数群：

#### `auth.user_id()`
現在のユーザーIDを取得

#### `get_user_organizations()`
ユーザーが所属する組織IDのリストを取得

#### `is_organization_member(org_id)`
ユーザーが組織のメンバーかチェック

#### `get_user_role(org_id)`
ユーザーの組織内ロールを取得

#### `is_organization_admin(org_id)`
ユーザーが組織のオーナーまたは管理者かチェック

### セキュリティ原則

1. **テナント分離**: 各組織のデータは厳密に分離
2. **最小権限の原則**: 必要最小限の権限のみ付与
3. **監査ログ**: 全てのアクションを記録
4. **不変性**: 監査ログは削除・更新不可

---

## 🚀 マイグレーション

### 実行手順

1. **Supabaseダッシュボードにアクセス**
2. **SQL Editorを開く**
3. **マイグレーションを順番に実行：**
   ```
   supabase/migrations/20250112000001_initial_schema.sql
   supabase/migrations/20250112000002_rls_policies.sql
   ```

### ローカル開発

Supabase CLIを使用する場合：

\`\`\`bash
# Supabaseプロジェクトを初期化
supabase init

# ローカルのSupabaseを起動
supabase start

# マイグレーションを実行
supabase db push
\`\`\`

---

## 📝 使用例

### 組織を作成してオーナーを設定

\`\`\`typescript
import { createClient } from '@/lib/supabase/server'

async function createOrganization(name: string, slug: string, userId: string) {
  const supabase = await createClient()

  // 組織を作成
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, slug })
    .select()
    .single()

  if (orgError) throw orgError

  // オーナーとして自分を追加
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'owner',
    })

  if (memberError) throw memberError

  return org
}
\`\`\`

### メンバーを招待

\`\`\`typescript
async function inviteMember(
  organizationId: string,
  email: string,
  role: 'admin' | 'member',
  invitedBy: string
) {
  const supabase = await createClient()
  const token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      token,
      invited_by: invitedBy,
    })
    .select()
    .single()

  if (error) throw error

  // メール送信処理...

  return data
}
\`\`\`

---

## 🔍 クエリ例

### ユーザーの所属組織一覧を取得

\`\`\`sql
SELECT o.*
FROM organizations o
INNER JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = auth.user_id();
\`\`\`

### 組織のメンバー一覧を取得（プロフィール付き）

\`\`\`sql
SELECT om.*, p.*
FROM organization_members om
INNER JOIN profiles p ON p.id = om.user_id
WHERE om.organization_id = 'org-id'
ORDER BY om.created_at DESC;
\`\`\`

### 組織の使用量と制限をチェック

\`\`\`sql
SELECT
  o.id,
  o.name,
  o.subscription_plan,
  ul.max_members,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as current_members
FROM organizations o
INNER JOIN usage_limits ul ON ul.plan = o.subscription_plan
WHERE o.id = 'org-id';
\`\`\`

---

## 📚 参考リンク

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostGIS Documentation](https://postgis.net/documentation/)
