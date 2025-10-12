# マルチテナントSaaSスターターキット

Next.js 15 + TypeScript + Supabaseで構築された、本番環境で使用できるマルチテナントSaaSのボイラープレート

## 🚀 特徴

- **マルチテナント対応**: 組織単位でのデータ完全分離、Row Level Security（RLS）
- **完全な認証システム**: サインアップ、ログイン、パスワードリセット、OAuth（Google）
- **組織・メンバー管理**: 招待、ロール管理（Owner/Admin/Member）、権限制御
- **サブスクリプション**: プラン管理、使用量追跡、Chargebee統合準備済み
- **マルチドメイン**: 4つのドメイン（マーケティング/アプリ/管理/運用）
- **7つの外部サービス統合**: Supabase、Cloudflare R2、Upstash Redis、Sentry、PostHog、Chargebee、Resend
- **監査ログ**: 全アクションの記録とトレーサビリティ
- **本番環境対応**: セキュリティ、スケーラビリティ、エラー監視

## 📋 技術スタック

### コア
- **Next.js 15** - React フレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Turbopack** - 高速ビルド

### バックエンド・インフラ
- **Supabase** - 認証、PostgreSQL + PostGIS
- **Cloudflare R2** - オブジェクトストレージ
- **Upstash Redis** - キャッシュ・セッション（サーバーレス）

### 監視・分析
- **Sentry** - エラー監視
- **PostHog** - プロダクト分析、フィーチャーフラグ

### 決済・通知
- **Chargebee** - サブスクリプション決済
- **Resend** - トランザクショナルメール

## 🏗️ プロジェクト構造

```
my-mcp-test/
├── docs/                           # ドキュメント
│   ├── PROJECT_PROGRESS.md         # 進捗状況
│   ├── DATABASE_SCHEMA.md          # データベース設計
│   └── ...
├── src/
│   ├── app/
│   │   ├── (www)/                  # マーケティングサイト
│   │   ├── (app)/                  # ユーザーアプリケーション
│   │   ├── (admin)/                # 管理画面
│   │   ├── (ops)/                  # 運用画面
│   │   └── actions/                # Server Actions
│   ├── components/                 # 再利用可能なコンポーネント
│   ├── lib/                        # ライブラリ・ヘルパー
│   ├── types/                      # TypeScript型定義
│   └── middleware.ts               # ドメインルーティング、IP制限
├── supabase/
│   └── migrations/                 # データベースマイグレーション
└── .env.local                      # 環境変数
```

## 🚦 クイックスタート

### 1. 依存関係のインストール

```bash
npm install
```

### 2. サービスアカウントの作成

7つの外部サービスのアカウントを作成し、APIキーを取得します。

**詳細な手順**: `docs/SERVICES_ACCOUNT_SETUP.md` を参照

必須サービス：
- Supabase（認証・データベース）
- Cloudflare R2（ストレージ）
- Upstash Redis（キャッシュ）
- Resend（メール送信）

推奨サービス：
- Sentry（エラー監視）
- PostHog（分析）
- Chargebee（決済、オプション）

### 3. 環境変数の設定

開発環境用の環境変数を設定：

```bash
# 開発環境に切り替え
npm run env:dev

# .env.local を編集して実際の認証情報を設定
# SERVICES_ACCOUNT_SETUP.mdで取得したAPIキーを設定
```

環境の詳細は `docs/ENVIRONMENT_SETUP.md` を参照してください。

### 4. データベースマイグレーション

Supabaseダッシュボードで以下のSQLファイルを順番に実行：

1. `supabase/migrations/20250112000001_initial_schema.sql`
2. `supabase/migrations/20250112000002_rls_policies.sql`

### 5. 開発サーバーの起動

```bash
npm run dev
```

以下のURLでアクセス：
- http://localhost:3000 - マーケティングサイト
- http://app.localhost:3000 - ユーザーアプリ
- http://admin.localhost:3000 - 管理画面
- http://ops.localhost:3000 - 運用画面

## 📚 主要機能

### 認証システム
- メールアドレス + パスワード登録
- Google OAuth
- パスワードリセット
- メール確認フロー

### 組織管理
- 組織の作成・編集・削除
- 組織の切り替え（複数組織所属対応）
- 14日間の無料トライアル
- サブスクリプションプラン管理

### メンバー管理
- メンバー招待（メール送信）
- ロール管理（Owner/Admin/Member）
- 権限ベースのアクセス制御
- メンバーの削除・退出

### サブスクリプション
- プラン表示（Free/Pro/Enterprise）
- 使用量の可視化
- 使用量制限のチェック
- Chargebee統合準備済み

### 管理画面（ADMIN）
- ユーザー一覧・管理
- 組織一覧・管理
- システム統計ダッシュボード

### 運用画面（OPS）
- システムステータス監視
- サービスヘルスチェック
- デプロイ履歴
- IP制限によるアクセス制御

## 🔒 セキュリティ

- **Row Level Security (RLS)**: PostgreSQLのRLSでテナント間のデータを完全分離
- **監査ログ**: 全ての重要アクションを記録
- **IP制限**: OPSドメインへのアクセスをIP制限
- **環境変数管理**: 機密情報は環境変数で管理
- **Sentry統合**: エラーの自動監視と通知

## 📖 ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照：

### セットアップガイド
- **`SERVICES_ACCOUNT_SETUP.md`** - 【最初に読む】7つのサービスアカウント作成手順
- `ENVIRONMENT_SETUP.md` - 環境設定ガイド（開発/ステージング/本番）
- `E2E_TESTING_GUIDE.md` - E2Eテスト実行ガイド
- `SUPABASE_SETUP.md` - Supabase設定ガイド
- `MULTI_DOMAIN_SETUP.md` - マルチドメイン設定

### リファレンス
- `PROJECT_PROGRESS.md` - プロジェクト進捗と完成機能一覧
- `DATABASE_SCHEMA.md` - データベース設計とテーブル定義

## 🚀 デプロイ

### Vercel推奨

#### 1. 環境の準備

このプロジェクトは3つの環境をサポート：
- **Development**: 開発環境（ブランチ: `develop`）
- **Staging**: ステージング環境（ブランチ: `staging`）
- **Production**: 本番環境（ブランチ: `main`）

#### 2. Vercelへのデプロイ

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel
```

#### 3. ドメイン設定

各環境にドメインを設定：

**Production**
- www.yourdomain.com
- app.yourdomain.com
- admin.yourdomain.com
- ops.yourdomain.com

**Staging**
- staging.yourdomain.com
- app.staging.yourdomain.com
- admin.staging.yourdomain.com
- ops.staging.yourdomain.com

#### 4. 環境変数の設定

Vercelダッシュボードで各環境の環境変数を設定。詳細は `docs/ENVIRONMENT_SETUP.md` を参照。

## 🎯 ロードマップ

実装済み機能：
- ✅ 認証・組織・メンバー管理
- ✅ サブスクリプション基盤
- ✅ 管理画面・運用画面
- ✅ マルチドメイン対応
- ✅ テスト環境（Vitest + Playwright）
- ✅ 環境分離（開発/ステージング/本番）

将来追加を検討している機能：
- [ ] APIキー管理
- [ ] Webhook統合
- [ ] CI/CD（GitHub Actions）
- [ ] パフォーマンスモニタリング

---

作成日: 2025-01-12
Next.js 15 + TypeScript + Supabase + マルチテナント
