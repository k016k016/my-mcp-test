# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 概要

これは、Next.js 15、TypeScript、Supabaseで構築された、本番環境対応の**マルチテナントSaaSボイラープレート**です。PostgreSQL Row Level Security (RLS) を使用した完全なテナント分離を実装し、複数のドメインで異なるユーザーインターフェースをサポートしています。

## コアアーキテクチャ

### マルチドメインシステム

アプリケーションは**4つの異なるドメイン**を使用し、それぞれ異なる目的を持ち、ミドルウェアを介して個別のNext.jsルートグループにマッピングされています：

- **WWW** (`localhost:3000` / `www.domain.com`) → `src/app/(www)/` - マーケティングサイト、認証
- **APP** (`app.localhost:3000` / `app.domain.com`) → `src/app/(app)/` - メインユーザーアプリケーション
- **ADMIN** (`admin.localhost:3000` / `admin.domain.com`) → `src/app/(admin)/` - 管理ダッシュボード
- **OPS** (`ops.localhost:3000` / `ops.domain.com`) → `src/app/(ops)/` - 運用ツール（IP制限あり）

ドメインルーティングロジックは以下に実装されています：
- `src/middleware.ts` - リクエストのインターセプト、ドメイン検出、IP制限
- `src/lib/domains/config.ts` - ドメイン設定とヘルパー関数

### マルチテナントアーキテクチャ

これは**マルチテナントシステム**で、各Organizationが独立したテナントとして機能します：

1. **データ分離**: PostgreSQL Row Level Security (RLS) がテナント間の完全なデータ分離を保証
2. **現在の組織**: ユーザーは複数の組織に所属可能。アクティブな組織はCookieに保存（`src/lib/organization/current.ts`経由）
3. **ロールベースアクセス制御 (RBAC)**: 組織ごとに3つのロール - `owner`、`admin`、`member`、それぞれ異なる権限

主要なデータベーステーブル（`src/types/database.ts`で定義）：
- `organizations` - テナントエンティティ
- `profiles` - ユーザープロフィール（Supabase auth.usersを拡張）
- `organization_members` - ロール付きの多対多リレーション
- `invitations` - メンバー招待システム
- `audit_logs` - コンプライアンスのためのアクション追跡
- `usage_limits` / `usage_tracking` - サブスクリプション管理

### Server Actionsパターン

このプロジェクトは**Next.js Server Actions**を排他的に使用します（従来のAPIルートなし）。すべてのバックエンドロジックは`src/app/actions/`にあります：
- `auth.ts` - 認証（サインアップ、ログイン、パスワードリセット、OAuth）
- `organization.ts` - 組織のCRUD操作
- `members.ts` - メンバー管理と招待

Server Actionsは以下を処理します：
- Zodスキーマを使用した入力バリデーション（`src/lib/validation.ts`）
- Redisを介したレート制限（`src/lib/rate-limit.ts`）
- CSRF保護（`src/lib/csrf.ts`）
- 自動的な再検証とリダイレクト

### 外部サービス統合

7つの外部サービスが統合されています（クライアントは`src/lib/[service]/`に配置）：

1. **Supabase** - 認証 + PostgreSQLデータベース
   - クライアント: `src/lib/supabase/server.ts`（Server Components）、`src/lib/supabase/client.ts`（Client Components）
   - ミドルウェア: `src/lib/supabase/middleware.ts`（セッション更新）

2. **Cloudflare R2** - S3互換オブジェクトストレージ
   - クライアント: `src/lib/r2/client.ts`、操作は`src/lib/r2/operations.ts`

3. **Upstash Redis** - サーバーレスRedis（HTTP経由）
   - クライアント: `src/lib/redis/client.ts`、操作は`src/lib/redis/operations.ts`
   - 用途: キャッシング、レート制限、セッションストレージ

4. **Sentry** - エラートラッキング（`sentry.*.config.ts`で設定）

5. **Logflare** - ログ管理と監査ログ
   - クライアント: `src/lib/logflare/index.ts`

6. **Chargebee** - サブスクリプション課金（オプション）
   - クライアント: `src/lib/chargebee/client.ts`、操作は`src/lib/chargebee/operations.ts`

7. **Resend** - トランザクションメール
   - クライアント: `src/lib/resend/client.ts`、操作は`src/lib/resend/operations.ts`

## 開発コマンド

### 環境セットアップ

このプロジェクトは**3つの環境**をサポートし、それぞれ個別の設定があります：

```bash
# 開発環境に切り替え
npm run env:dev

# ステージング環境に切り替え
npm run env:staging

# 本番環境に切り替え（注意して使用！）
npm run env:production
```

切り替え後、`.env.local`を実際のAPIキーで編集してください。詳細なセットアップ手順は`docs/SERVICES_ACCOUNT_SETUP.md`を参照してください。

### 開発

```bash
# Turbopackで開発サーバーを起動
npm run dev

# ステージング環境変数で起動
npm run dev:staging
```

以下のURLでアプリケーションにアクセス：
- http://localhost:3000 - マーケティングサイト
- http://app.localhost:3000 - ユーザーアプリ
- http://admin.localhost:3000 - 管理パネル
- http://ops.localhost:3000 - 運用ダッシュボード

### ビルド

```bash
# 本番環境用にビルド
npm run build

# ステージング用にビルド
npm run build:staging

# 本番環境用にビルド（明示的）
npm run build:production

# 本番サーバーを起動
npm run start
```

### リント

```bash
# ESLintを実行
npm run lint
```

### テスト

**ユニットテスト**（Vitest + Testing Library）：
```bash
# すべてのユニットテストを実行
npm run test

# UIでテストを実行
npm run test:ui

# カバレッジレポート付きでテストを実行
npm run test:coverage
```

ユニットテストはソースファイルと同じ場所の`__tests__/`ディレクトリに配置されています。

**E2Eテスト**（Playwright）：
```bash
# E2Eテストを実行（開発サーバーを自動起動）
npm run test:e2e

# Playwright UIでE2Eテストを実行
npm run test:e2e:ui

# ヘッドモードでE2Eテストを実行（ブラウザを表示）
npm run test:e2e:headed
```

E2Eテストは`e2e/`ディレクトリにあります。設定：`playwright.config.ts`

## 重要なパターンと規約

### 認証フロー

1. ユーザーが`(www)/signup`でサインアップ → Server Action `signUp()` → Supabaseがauth.usersエントリを作成
2. トリガーが自動的に`profiles`テーブルにプロフィールを作成
3. メール確認後、ユーザーはログイン可能
4. 初回ログイン時、`(app)/onboarding/create-organization`にリダイレクトして最初の組織を作成
5. ユーザーはその組織の`owner`になる

### 組織コンテキスト

データ操作では常に現在の組織を取得してください：

```typescript
import { getCurrentOrganizationId } from '@/lib/organization/current'

const orgId = await getCurrentOrganizationId()
if (!orgId) {
  // 処理: ユーザーがどの組織にも所属していない
}

// RLSのため、すべてのクエリはorganization_idでフィルタする必要があります
const { data } = await supabase
  .from('some_table')
  .select('*')
  .eq('organization_id', orgId)
```

### Server Actionsの作成

新しいServer Actionsを追加する際は、このパターンに従ってください：

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentOrganizationId } from '@/lib/organization/current'

export async function myAction(formData: FormData) {
  try {
    // 1. 入力をバリデーション
    const validation = validateFormData(mySchema, formData)
    if (!validation.success) {
      return { error: validation.error }
    }

    // 2. 認証をチェック
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized' }
    }

    // 3. 現在の組織を取得
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return { error: 'No organization selected' }
    }

    // 4. 操作を実行（RLSがテナント分離を処理）
    const { data, error } = await supabase
      .from('table')
      .insert({ ...validation.data, organization_id: orgId })

    if (error) throw error

    // 5. 再検証して返す
    revalidatePath('/some-path')
    return { success: true, data }
  } catch (error) {
    console.error('[myAction]', error)
    return { error: 'Operation failed' }
  }
}
```

### データベースマイグレーション

マイグレーションは`supabase/migrations/`にあります。適用方法：

1. Supabase Dashboard → SQL Editorを開く
2. マイグレーションファイルを順番に実行：
   - `20250112000001_initial_schema.sql` - テーブルとインデックス
   - `20250112000002_rls_policies.sql` - Row Level Securityポリシー

Supabase CLIでのローカル開発の場合：
```bash
supabase db push
```

### 外部サービスクライアントのテスト

すべてのサービスクライアントは、モックを使用した包括的なユニットテストを持っています。新しいサービス操作を追加する場合：

1. `src/lib/[service]/operations.ts`に関数を追加
2. `src/lib/[service]/__tests__/operations.test.ts`にテストを追加
3. 外部呼び出しをモック（既存のテストでパターンを参照）

### ミドルウェアの動作

`src/middleware.ts`はすべてのリクエストで実行され、以下を行います：
1. ホスト名からドメインタイプを判定
2. OPSドメインのIP制限を適用（`OPS_ALLOWED_IPS`が設定されている場合）
3. Supabaseセッションを更新
4. 適切なルートグループにURLをリライト

**注意**: ミドルウェアは静的アセットを除くすべてのリクエストで実行されます（`config.matcher`で設定）。

## よくあるハマりどころ

1. **Windows開発**: PowerShellまたはGit Bashを使用してください。一部のスクリプトはUnixスタイルのコマンドを使用しています。`docs/CROSS_PLATFORM_DEVELOPMENT.md`を参照してください。

2. **Supabaseクライアントの使用**:
   - Server Components/Actionsでは`@/lib/supabase/server`の`createClient()`を使用
   - Client Componentsでは`@/lib/supabase/client`の`createClient()`を使用
   - 絶対に混在させないこと

3. **RLSのテスト**: データベース操作をテストする際は、認証されていることを確認してください。RLSポリシーは未認証のリクエストをブロックします。

4. **組織コンテキスト**: 操作の前に常に現在の組織をチェックしてください。ユーザーが組織を持っていない場合があります（例：新規ユーザー）。

5. **レート制限**: ログイン試行とパスワードリセットはRedis経由でレート制限されています。Redisが利用できない場合、レート制限はフェイルオープン（リクエストを許可）します。

6. **環境変数**:
   - `NEXT_PUBLIC_*`変数はブラウザに公開されます
   - `NEXT_PUBLIC_*`変数には絶対にシークレットを入れないこと
   - サービスロールキーはサーバーサイドでのみ使用すべき

7. **ドメインのテスト**: ローカルでテストする際は、`*.localhost:3000`サブドメインを使用してください。ほとんどのブラウザはhostsファイルの変更なしにこれを正しく処理します。

## 主要ドキュメント

- `docs/SERVICES_ACCOUNT_SETUP.md` - **ここから始める**: 7つの外部サービスすべてのセットアップ完全ガイド
- `docs/DATABASE_SCHEMA.md` - データベース構造、RLSポリシー、使用パターン
- `docs/ENVIRONMENT_SETUP.md` - 開発/ステージング/本番環境の環境変数設定
- `docs/MULTI_DOMAIN_SETUP.md` - マルチドメインルーティングの仕組み
- `docs/E2E_TESTING_GUIDE.md` - E2Eテストのセットアップとパターン
- `docs/PROJECT_PROGRESS.md` - 現在の実装状況とロードマップ
