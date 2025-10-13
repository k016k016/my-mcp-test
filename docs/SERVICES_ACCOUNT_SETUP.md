# サービスアカウント作成と設定の完全ガイド

このガイドでは、7つの外部サービスのアカウント作成から環境変数の設定まで、順番に説明します。

## 📋 必要なサービス一覧

1. **Supabase** - 認証、データベース（PostgreSQL + PostGIS）
2. **Cloudflare R2** - オブジェクトストレージ
3. **Upstash Redis** - キャッシュ・セッション管理
4. **Sentry** - エラー監視
5. **Logflare** - ログ管理・監査ログ
6. **Chargebee** - サブスクリプション決済
7. **Resend** - トランザクショナルメール

---

## 1. Supabase（必須）

### アカウント作成

1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ（推奨）
4. メール確認

### プロジェクト作成（開発環境）

1. ダッシュボードで「New project」をクリック
2. 以下を入力：
   - **Name**: `my-saas-dev`（開発用）
   - **Database Password**: 強力なパスワードを生成（保存必須！）
   - **Region**: `Northeast Asia (Tokyo)`（日本の場合）
   - **Pricing Plan**: Free（開発用）
3. 「Create new project」をクリック（2〜3分待つ）

### 認証情報の取得

1. 左サイドバーの「Project Settings」（歯車アイコン）をクリック
2. 「API」をクリック
3. 以下をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Google OAuth設定（オプション）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
4. アプリケーションの種類: **ウェブアプリケーション**
5. 承認済みのリダイレクトURIを追加:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
6. クライアントIDとクライアントシークレットをコピー
7. Supabaseダッシュボード→「Authentication」→「Providers」→「Google」
8. 「Enable Google provider」をONにして、クライアントIDとシークレットを入力

### 環境変数に設定

`.env.development` を編集：
```bash
# Supabase（開発用プロジェクト）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Cloudflare R2（必須）

### アカウント作成

1. https://dash.cloudflare.com/sign-up にアクセス
2. メールアドレスとパスワードを入力
3. メール確認

### R2の有効化

1. ダッシュボードで「R2」をクリック
2. 「Begin setup」をクリック
3. クレジットカード情報を入力（無料枠あり: 月10GB保存、月100万回リクエスト）
4. 「Purchase R2」をクリック

### バケット作成（開発環境）

1. 「Create bucket」をクリック
2. **Bucket name**: `dev-my-saas-uploads`
3. **Location**: `Asia-Pacific (APAC)`
4. 「Create bucket」をクリック

### APIトークン作成

1. 右上のアカウントメニュー →「My Profile」→「API Tokens」
2. 「R2 API Tokens」タブをクリック
3. 「Create API token」をクリック
4. 以下を設定：
   - **Token name**: `dev-my-saas-r2-token`
   - **Permissions**: `Object Read & Write`
   - **TTL**: Start now
5. 「Create API Token」をクリック
6. 以下をコピー（画面を閉じると二度と見れない！）：
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

### アカウントIDの取得

1. R2のダッシュボードに戻る
2. 右側に表示されている「Account ID」をコピー → `R2_ACCOUNT_ID`

### 公開URL設定（オプション）

1. バケットの設定で「Settings」タブ
2. 「Public Access」セクションで「Allow Access」をクリック
3. 表示されたURLをコピー → `R2_PUBLIC_URL`

または、カスタムドメインを設定:
1. 「Custom Domains」で「Connect Domain」
2. ドメインを入力（例: `cdn.yourdomain.com`）
3. DNS設定を完了

### 環境変数に設定

`.env.development` を編集：
```bash
# Cloudflare R2（開発用バケット）
R2_ACCOUNT_ID=abc123def456ghi789
R2_ACCESS_KEY_ID=1234567890abcdef1234567890abcdef
R2_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890abcdef12
R2_BUCKET_NAME=dev-my-saas-uploads
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
```

---

## 3. Upstash Redis（必須）

### アカウント作成

1. https://upstash.com にアクセス
2. 「Get Started」をクリック
3. GitHubまたはGoogleアカウントでサインアップ
4. メール確認

### データベース作成（開発環境）

1. ダッシュボードで「Create Database」をクリック
2. 以下を設定：
   - **Name**: `dev-my-saas-cache`
   - **Type**: `Regional`
   - **Region**: `ap-northeast-1`（東京）
   - **TLS**: `Enabled`（推奨）
   - **Eviction**: `noeviction`（キャッシュ用）
3. 「Create」をクリック

### 認証情報の取得

1. 作成したデータベースをクリック
2. 「REST API」タブをクリック
3. 以下をコピー：
   - **UPSTASH_REDIS_REST_URL** → `UPSTASH_REDIS_REST_URL`
   - **UPSTASH_REDIS_REST_TOKEN** → `UPSTASH_REDIS_REST_TOKEN`

### 環境変数に設定

`.env.development` を編集：
```bash
# Upstash Redis（開発用インスタンス）
UPSTASH_REDIS_REST_URL=https://xxxxx-yyyyy-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbCdEf123456...
```

---

## 4. Sentry（推奨）

### アカウント作成

1. https://sentry.io/signup/ にアクセス
2. メールアドレスとパスワードを入力、またはGitHubでサインアップ
3. メール確認

### プロジェクト作成

1. 「Create Project」をクリック
2. 以下を選択：
   - **Platform**: `Next.js`
   - **Alert frequency**: `On every new issue`
   - **Project name**: `my-saas-dev`
   - **Team**: デフォルトのまま
3. 「Create Project」をクリック

### DSNの取得

1. プロジェクト作成後、自動的にDSNが表示される
2. または、「Settings」→「Projects」→プロジェクト名→「Client Keys (DSN)」
3. **DSN**をコピー → `NEXT_PUBLIC_SENTRY_DSN`

### Auth Tokenの作成（CI/CD用）

1. 右上のアカウントメニュー→「Auth Tokens」
2. 「Create New Token」をクリック
3. 以下を設定：
   - **Scopes**: `project:releases`, `project:write`
   - **Token name**: `my-saas-deploy-token`
4. 「Create Token」をクリック
5. トークンをコピー → `SENTRY_AUTH_TOKEN`

### 組織とプロジェクトのSlug取得

1. URLを確認: `https://sentry.io/organizations/{org-slug}/projects/{project-slug}/`
2. **組織Slug** → `SENTRY_ORG`
3. **プロジェクトSlug** → `SENTRY_PROJECT`

### 環境変数に設定

`.env.development` を編集（開発環境では無効化推奨）：
```bash
# Sentry（開発環境では無効化推奨）
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

`.env.staging` と `.env.production` には実際の値を設定：
```bash
# Sentry（ステージング/本番環境）
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o12345.ingest.sentry.io/67890
SENTRY_ORG=my-organization
SENTRY_PROJECT=my-saas-staging
SENTRY_AUTH_TOKEN=sntrys_abc123def456...
```

---

## 5. Logflare（推奨）

### アカウント作成

1. https://logflare.app にアクセス
2. GitHubまたはGoogleでサインアップ
3. メール確認

### Source作成（ログの送信先）

1. ダッシュボードで「Create Source」をクリック
2. 以下を入力：
   - **Source name**: `my-saas-logs`（開発用）
   - **Description**: Application and audit logs
3. 「Create Source」をクリック

### API KeyとSource IDの取得

1. ダッシュボード右上のアカウントアイコン →「Account」
2. 「API Keys」タブをクリック
3. **API Key**をコピー → `NEXT_PUBLIC_LOGFLARE_API_KEY`
4. 作成したSourceをクリック
5. Source詳細ページで **Source ID** をコピー → `NEXT_PUBLIC_LOGFLARE_SOURCE_ID`

### 環境変数に設定

`.env.development` を編集：
```bash
# Logflare（開発用）
NEXT_PUBLIC_LOGFLARE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_LOGFLARE_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 複数環境の設定（推奨）

Logflareで環境ごとに別Sourceを作成：
1. 「Create Source」で `my-saas-staging` と `my-saas-production` を作成
2. 各SourceのSource IDを対応する `.env.*` に設定
3. API Keyは同じものを使用可能

### 使用方法

```typescript
import { logger } from '@/lib/logflare'

// 監査ログ
await logger.audit('user_login', {
  userId: user.id,
  organizationId: org.id,
})

// 一般ログ
logger.info('処理完了', { itemCount: 10 })

// エラーログ
logger.error('エラー発生', new Error('Something went wrong'))
```

### Logflareでのログ検索

Logflareダッシュボードで以下のようにSQLライクなクエリが可能：
```sql
-- 特定ユーザーのログ
SELECT * FROM logs WHERE metadata.userId = 'user123'

-- エラーログのみ
SELECT * FROM logs WHERE level = 'error'

-- 監査ログのみ
SELECT * FROM logs WHERE metadata.isAudit = true
```

### 料金

- **無料プラン**: 月12百万イベント、7日保持
- **有料プラン**: $5/月〜（月100百万イベント、30日保持）

---

## 6. Chargebee（オプション - 決済機能を使う場合）

### アカウント作成

1. https://www.chargebee.com/trial-signup/ にアクセス
2. ビジネス情報を入力
3. メール確認

### テストサイト作成

1. ダッシュボードで「Settings」→「Configure Chargebee」
2. 以下を入力：
   - **Site name**: `my-saas-test`（テスト用）
   - **Currency**: `JPY` または `USD`
   - **Business entity**: 適切なものを選択
3. 「Continue」をクリック

### API Keyの取得

1. 「Settings」→「API Keys and Webhooks」
2. 「API Keys」タブで「+ API Key」をクリック
3. **Key name**: `dev-api-key`
4. **Permissions**: `Full Access`（開発用）
5. 「Create」をクリック
6. API Keyをコピー → `CHARGEBEE_API_KEY`
7. サイト名（URL: `{site}.chargebee.com`）→ `CHARGEBEE_SITE`

### プランの作成

1. 「Product Catalog」→「Plans」
2. 「+ Plan」をクリック
3. Free/Pro/Enterpriseプランを作成（データベーススキーマと一致させる）

### 環境変数に設定

`.env.development` を編集：
```bash
# Chargebee（テストモード）
CHARGEBEE_SITE=my-saas-test
CHARGEBEE_API_KEY=test_abc123def456...
```

### 本番環境への移行

1. 本番用サイトを別途作成（`my-saas-live`）
2. テストモード→本番モードに切り替え
3. 支払いゲートウェイ（Stripe等）を設定
4. `.env.production` に本番用の認証情報を設定

---

## 7. Resend（必須）

### アカウント作成

1. https://resend.com/signup にアクセス
2. メールアドレスを入力
3. メール確認

### ドメイン認証（推奨）

#### カスタムドメインを使う場合

1. ダッシュボードで「Domains」→「+ Add Domain」
2. ドメインを入力（例: `yourdomain.com`）
3. 表示されたDNSレコードをドメインのDNS設定に追加：
   - **TXT レコード**: SPF認証用
   - **CNAME レコード**: DKIM認証用
4. 「Verify DNS Records」をクリック（DNS反映に最大48時間）

#### 開発環境でカスタムドメインなし

開発環境では、Resendのデフォルトドメイン（`onboarding@resend.dev`）を使用可能。ただし、1日10通の制限があります。

### API Keyの作成

1. 「API Keys」→「+ Create API Key」
2. 以下を設定：
   - **Name**: `dev-api-key`
   - **Permission**: `Sending access`
   - **Domain**: `All domains` または特定のドメイン
3. 「Add」をクリック
4. API Keyをコピー → `RESEND_API_KEY`（画面を閉じると二度と見れない！）

### メールテンプレートの確認

1. `src/lib/email/templates/` にテンプレートを作成
2. テスト送信で確認

### 環境変数に設定

`.env.development` を編集：
```bash
# Resend（開発用APIキー）
RESEND_API_KEY=re_abc123def456...
```

---

## 環境別の設定まとめ

### 開発環境（.env.development）

```bash
# 環境識別子
NODE_ENV=development
NEXT_PUBLIC_ENV=development

# マルチドメイン設定
NEXT_PUBLIC_WWW_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://app.localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://admin.localhost:3000
NEXT_PUBLIC_OPS_URL=http://ops.localhost:3000

# OPS用IP制限（開発環境では無効）
OPS_ALLOWED_IPS=

# Supabase（開発用プロジェクト）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudflare R2（開発用バケット）
R2_ACCOUNT_ID=abc123def456ghi789
R2_ACCESS_KEY_ID=1234567890abcdef1234567890abcdef
R2_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890abcdef12
R2_BUCKET_NAME=dev-my-saas-uploads
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev

# Upstash Redis（開発用インスタンス）
UPSTASH_REDIS_REST_URL=https://xxxxx-yyyyy-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbCdEf123456...

# Sentry（開発環境では無効化推奨）
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Logflare（開発用）
NEXT_PUBLIC_LOGFLARE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_LOGFLARE_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Chargebee（テストモード）
CHARGEBEE_SITE=my-saas-test
CHARGEBEE_API_KEY=test_abc123def456...

# Resend（開発用APIキー）
RESEND_API_KEY=re_abc123def456...
```

### ステージング環境（.env.staging）

ステージング環境では、開発環境と同じ構成で、以下を変更：
- ドメインをステージング用に変更
- 各サービスでステージング用のプロジェクト/インスタンスを作成
- Sentryを有効化
- OPS_ALLOWED_IPsを設定

### 本番環境（.env.production）

本番環境では、すべてのサービスで本番用のプロジェクト/インスタンスを作成：
- ドメインを本番用に変更
- Chargebeeを本番モードに変更
- OPS_ALLOWED_IPsを必ず設定
- すべてのサービスで本番用の認証情報を使用

---

## セットアップチェックリスト

### 必須サービス

- [ ] **Supabase**
  - [ ] 開発用プロジェクト作成
  - [ ] Project URLとAnon Keyを取得
  - [ ] `.env.development` に設定
  - [ ] データベースマイグレーション実行
  - [ ] Google OAuth設定（オプション）

- [ ] **Cloudflare R2**
  - [ ] アカウント作成とR2有効化
  - [ ] 開発用バケット作成
  - [ ] APIトークン作成
  - [ ] Account IDを取得
  - [ ] `.env.development` に設定

- [ ] **Upstash Redis**
  - [ ] アカウント作成
  - [ ] 開発用データベース作成
  - [ ] REST URLとTokenを取得
  - [ ] `.env.development` に設定

- [ ] **Resend**
  - [ ] アカウント作成
  - [ ] API Key作成
  - [ ] `.env.development` に設定
  - [ ] ドメイン認証（本番環境）

### 推奨サービス

- [ ] **Sentry**
  - [ ] アカウント作成
  - [ ] プロジェクト作成
  - [ ] DSNとAuth Token取得
  - [ ] `.env.staging` と `.env.production` に設定

- [ ] **Logflare**
  - [ ] アカウント作成
  - [ ] Source作成
  - [ ] API KeyとSource ID取得
  - [ ] `.env.development` に設定

### オプションサービス

- [ ] **Chargebee**
  - [ ] アカウント作成
  - [ ] テストサイト作成
  - [ ] API Key取得
  - [ ] プラン作成
  - [ ] `.env.development` に設定

---

## 次のステップ

1. **環境変数の確認**
   ```bash
   # 開発環境に切り替え
   npm run env:dev

   # .env.localを開いて確認
   cat .env.local
   ```

2. **データベースマイグレーション**
   - Supabaseダッシュボードで `supabase/migrations/` のSQLを実行

3. **開発サーバー起動**
   ```bash
   npm run dev
   ```

4. **動作確認**
   - http://localhost:3000 でマーケティングページにアクセス
   - サインアップを試す
   - 組織作成を試す
   - メンバー招待を試す（Resendのメール送信確認）

5. **ステージング・本番環境の準備**
   - 各サービスでステージング用、本番用のプロジェクト/インスタンスを作成
   - `.env.staging` と `.env.production` に設定
   - Vercelで環境変数を設定

---

## トラブルシューティング

### Supabaseに接続できない

- Project URLが正しいか確認
- Anon Keyが正しいか確認
- ブラウザのコンソールでエラーを確認

### R2にアップロードできない

- Access Key IDとSecret Access Keyが正しいか確認
- バケット名が正しいか確認
- CORSポリシーを設定（バケット設定→CORS）

### Redisに接続できない

- REST URLとTokenが正しいか確認
- データベースが起動しているか確認（Upstashダッシュボード）

### メールが送信されない

- Resend API Keyが正しいか確認
- ドメイン認証が完了しているか確認（本番環境）
- Resendダッシュボードで送信ログを確認

### Sentryにエラーが表示されない

- DSNが正しいか確認
- 環境変数が正しく設定されているか確認
- 開発環境では無効化されている可能性（意図的）

---

## 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Logflare Documentation](https://logflare.app/guides)
- [Chargebee API Documentation](https://apidocs.chargebee.com/docs/api)
- [Resend Documentation](https://resend.com/docs)
