# ドキュメント構成

このディレクトリには、マルチテナントSaaSスターターキットのドキュメントが整理されています。

## 📁 フォルダ構成

### `guides/` - ガイド・手順書
開発環境のセットアップや開発ワークフローの手順書

| ファイル | 説明 |
|---------|------|
| `CROSS_PLATFORM_DEVELOPMENT.md` | MacとWindows間での開発方法 |
| `DEVELOPMENT_WORKFLOW.md` | 開発ワークフローの手順 |
| `E2E_TESTING_GUIDE.md` | E2Eテストの実行方法 |
| `ENVIRONMENT_ACCOUNTS_STRATEGY.md` | 環境とアカウントの戦略 |
| `ENVIRONMENT_SETUP.md` | 環境設定ガイド（開発/ステージング/本番） |
| `SUPABASE_DATA_MANAGEMENT.md` | Supabaseデータ管理ツール |

### `proposals/` - 提案・仕様書（草案）
新機能の提案や実装前の検討事項

| ファイル | 説明 |
|---------|------|
| `NOTIFICATION_SETTINGS.md` | 通知設定機能の仕様書（草案） |
| `WIKI_FEATURE.md` | Wiki機能の詳細仕様書（草案） |
| `WIKI_MVP_4HOURS.md` | Wiki機能のMVP実装案（4時間） |

### `services/` - 外部サービス設定
7つの外部サービスのセットアップ手順

| ファイル | 説明 |
|---------|------|
| `SERVICES_ACCOUNT_SETUP.md` | **【最初に読む】** 7つのサービスアカウント作成手順 |
| `SUPABASE_SETUP.md` | Supabase設定ガイド |
| `R2_SETUP.md` | Cloudflare R2設定ガイド |
| `UPSTASH_REDIS_SETUP.md` | Upstash Redis設定ガイド |
| `VERCEL_SETUP.md` | Vercel設定ガイド |
| `POSTGIS_SETUP.md` | PostGIS拡張機能のセットアップ |
| `SERVICES_SETUP.md` | その他のサービス設定 |

### `specifications/` - 仕様書・設計書
システムの仕様や設計に関する詳細なドキュメント

| ファイル | 説明 |
|---------|------|
| `AUTH_FLOW_SPECIFICATION.md` | 認証フローの詳細仕様 |
| `DATABASE_SCHEMA.md` | データベース設計とテーブル定義 |
| `MULTI_DOMAIN_SETUP.md` | マルチドメイン設定の仕様 |
| `B2B_USER_FLOW.md` | B2Bユーザーフローの仕様 |
| `E2E_TEST_ADMIN_DOMAIN.md` | ADMINドメインのE2Eテスト仕様 |
| `E2E_TEST_APP_DOMAIN.md` | APPドメインのE2Eテスト仕様 |
| `E2E_TEST_OPS_DOMAIN.md` | OPSドメインのE2Eテスト仕様 |
| `E2E_TEST_ORG_SWITCHING.md` | 組織切り替えのE2Eテスト仕様 |

### `project/` - プロジェクト管理
プロジェクトの進捗や管理に関する情報

| ファイル | 説明 |
|---------|------|
| `PROJECT_PROGRESS.md` | プロジェクト進捗と完成機能一覧 |

## 📋 主要なドキュメント

### セットアップ（最初に読む）
1. **`services/SERVICES_ACCOUNT_SETUP.md`** - 7つの外部サービスアカウント作成
2. **`guides/ENVIRONMENT_SETUP.md`** - 環境設定ガイド
3. **`services/SUPABASE_SETUP.md`** - Supabase設定

### 開発・運用
- **`guides/DEVELOPMENT_WORKFLOW.md`** - 開発ワークフロー
- **`guides/E2E_TESTING_GUIDE.md`** - E2Eテスト実行
- **`guides/SUPABASE_DATA_MANAGEMENT.md`** - データ管理ツール

### 仕様・設計
- **`specifications/DATABASE_SCHEMA.md`** - データベース設計
- **`specifications/AUTH_FLOW_SPECIFICATION.md`** - 認証フロー仕様
- **`specifications/MULTI_DOMAIN_SETUP.md`** - マルチドメイン設定

### 進捗・管理
- **`project/PROJECT_PROGRESS.md`** - プロジェクト進捗
- **`IMPLEMENTATION_LOG.md`** - 実装ログ
- **`PROGRESS_2025-01-17.md`** - 進捗レポート

## 🚀 クイックスタート

### 新規セットアップ
1. `services/SERVICES_ACCOUNT_SETUP.md` を読む
2. `guides/ENVIRONMENT_SETUP.md` に従って環境設定
3. `services/SUPABASE_SETUP.md` でデータベース設定

### 開発開始
1. `guides/DEVELOPMENT_WORKFLOW.md` で開発フローを確認
2. `guides/E2E_TESTING_GUIDE.md` でテスト環境を構築
3. `specifications/DATABASE_SCHEMA.md` でデータベース設計を理解

### 新機能開発
1. `proposals/` フォルダで新機能の提案を検討
2. `specifications/` フォルダで仕様を詳細化
3. `project/PROJECT_PROGRESS.md` で進捗を管理

## 📝 ドキュメントの更新

- **新機能の提案**: `proposals/` フォルダに追加
- **仕様の確定**: `specifications/` フォルダに移動
- **進捗の更新**: `project/PROJECT_PROGRESS.md` を更新
- **実装ログ**: `IMPLEMENTATION_LOG.md` に記録

---

**最終更新**: 2025-01-17
**メンテナンス**: 構成変更時はこのファイルを更新してください
