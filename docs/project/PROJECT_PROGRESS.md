# プロジェクト進捗状況

最終更新: 2025-10-15

## 📋 概要

マルチテナント対応のSaaSスターターキット（ボイラープレート）。
Next.js 15 + Supabase + マルチドメイン構成。

## ✅ 実装済み機能

### コア機能
- **認証**: サインアップ、ログイン、パスワードリセット、OAuth、メール確認
- **組織管理**: CRUD、切り替え、14日間トライアル
- **メンバー管理**: 招待、ロール変更（owner/admin/member）、削除
- **サブスクリプション**: プラン表示、使用量可視化
- **設定画面**: プロフィール、通知、組織、メンバー、サブスクリプション

### マルチドメイン（4ドメイン対応）
- **WWW** (`localhost:3000`) - マーケティング + 認証
- **APP** (`app.localhost:3000`) - メインアプリケーション
- **ADMIN** (`admin.localhost:3000`) - 管理画面
- **OPS** (`ops.localhost:3000`) - 運用画面（IP制限あり）

### データベース
- PostgreSQL + PostGIS (Supabase)
- Row Level Security（RLS）でテナント分離
- マイグレーション: `supabase/migrations/`

### 外部サービス統合
- Supabase (Auth + DB), Cloudflare R2, Upstash Redis, Sentry, Chargebee, Resend

## 🚀 クイックスタート

```bash
# 開発サーバー起動
npm run dev

# アクセス
http://localhost:3000          # WWW
http://app.localhost:3000      # APP
http://admin.localhost:3000    # ADMIN
http://ops.localhost:3000      # OPS

# テスト
npm run test              # ユニットテスト
npm run test:e2e          # E2Eテスト（localhost）
npm run test:e2e:preview  # E2Eテスト（Preview環境）

# Supabaseデータクリア
npm run supabase:clear
```

## 📂 主要ファイル

```
src/
├── app/
│   ├── (www)/          # WWWドメイン
│   ├── (app)/          # APPドメイン
│   ├── (admin)/        # ADMINドメイン
│   ├── (ops)/          # OPSドメイン
│   └── actions/        # Server Actions
├── lib/
│   ├── supabase/       # Supabase設定
│   ├── domains/        # ドメイン管理
│   └── organization/   # 組織管理
└── middleware.ts       # ドメインルーティング

supabase/
├── migrations/         # DBマイグレーション
└── scripts/           # データ管理スクリプト

e2e/                   # E2Eテスト
docs/                  # ドキュメント
```

## 🔧 セットアップ

詳細は以下のドキュメントを参照:
- **環境設定**: `docs/ENVIRONMENT_SETUP.md`
- **サービス設定**: `docs/SERVICES_ACCOUNT_SETUP.md`
- **開発ワークフロー**: `docs/DEVELOPMENT_WORKFLOW.md`
- **データベース**: `docs/DATABASE_SCHEMA.md`

## 📅 最新更新（2025-10-15）

### Vercel自動デプロイ設定
- develop → Preview環境、main → Production環境
- GitHub-Vercel連携の修正
- カスタムドメイン設定（Preview: cocktailorder.com）

### Cookie共有実装
- サブドメイン間で認証Cookie共有（`.localhost`, `.cocktailorder.com`）
- 修正: `src/lib/supabase/{server,middleware,client}.ts`

### E2Eテスト環境整備
- localhost/Preview環境対応（環境変数でbaseURL切り替え）
- Cookie共有テスト追加
- テストファイル: `e2e/{localhost,vercel-preview}.spec.ts`

### Supabaseデータ管理ツール
- データクリアスクリプト: `supabase/scripts/clear-all-data.sql`
- コマンド: `npm run supabase:clear`
- ドキュメント: `docs/SUPABASE_DATA_MANAGEMENT.md`

## 🎯 次のステップ

1.サインアップの流れを完成させる（権限はadmin）
2.adminでユーザを追加できる。権限も設定可能
3.adminでユーザを削除・変更できる。（論理削除）