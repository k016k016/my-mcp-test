# プロジェクト進捗状況

最終更新: 2025-10-24

## 📋 概要

マルチテナント対応のSaaSスターターキット（ボイラープレート）。
Next.js 15 + Supabase + マルチドメイン構成。

## ✅ 実装済み機能

### コア機能
- **認証**: サインアップ、ログイン、パスワードリセット、OAuth、メール確認
  - サインアップ時に自動的に組織作成（ownerロール付与）
  - 権限に応じた自動リダイレクト（OPS/ADMIN/APP）
- **組織管理**: CRUD、切り替え、複数組織対応
- **メンバー管理**: 招待、ロール変更（owner/admin/member）、論理削除
  - ローカル環境: 直接ユーザー作成（パスワード固定）
  - 本番環境: メール招待経由
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
docs/                  # ドキュメント（構成は docs/README.md を参照）
```

## 🔧 セットアップ

詳細は以下のドキュメントを参照:
- **環境設定**: `docs/ENVIRONMENT_SETUP.md`
- **サービス設定**: `docs/SERVICES_ACCOUNT_SETUP.md`
- **開発ワークフロー**: `docs/DEVELOPMENT_WORKFLOW.md`
- **データベース**: `docs/DATABASE_SCHEMA.md`

## 📅 最新更新（2025-10-24）

### 認証フロー完全実装
- サインアップ時の自動組織作成とowner権限付与
- ログイン後の権限ベースリダイレクト（OPS/ADMIN/APP）
- 現在の組織IDをCookieに自動設定

### メンバー管理機能完成
- メンバー招待（ロール指定可能: owner/admin/member）
- メンバーのロール変更機能
- メンバーの論理削除機能（deleted_at使用）
- 環境別処理（ローカル: 直接作成、本番: メール招待）

### E2Eテストのベストプラクティス適用
- ローディングインジケーターのライフサイクル検証
- E2E遅延フラグ（`__E2E_FORCE_PENDING_MS__`）のサポート
- APP domainのプロフィール更新・パスワード変更テスト改善

### ドキュメント整備
- E2Eベストプラクティスガイド追加
- セキュリティドキュメント追加
- 各種提案書追加（Wiki、国際化、アクセシビリティなど）

## 🎯 次のステップ候補

### 機能拡張
1. **Wiki機能** - 組織内のナレッジ共有（提案書: `docs/proposals/WIKI_FEATURE.md`）
2. **通知設定** - メール・Slack通知の詳細設定（提案書: `docs/proposals/NOTIFICATION_SETTINGS.md`）
3. **国際化（i18n）** - 多言語対応（提案書: `docs/proposals/INTERNATIONALIZATION.md`）
4. **アクセシビリティ** - WCAG準拠（提案書: `docs/proposals/ACCESSIBILITY.md`）

### パフォーマンス・UX改善
5. **レスポンシブデザイン強化** - モバイル対応の改善（提案書: `docs/proposals/RESPONSIVE_DESIGN.md`）
6. **パフォーマンス最適化** - 読み込み速度改善（提案書: `docs/proposals/PERFORMANCE_OPTIMIZATION.md`）

### 運用・保守
7. **監査ログビューア** - OPSドメインでの監査ログ閲覧機能
8. **使用量ダッシュボード** - 組織ごとの使用量可視化強化
9. **E2Eテストカバレッジ拡大** - 全ドメイン・全機能のテストカバー