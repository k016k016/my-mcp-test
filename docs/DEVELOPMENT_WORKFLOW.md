# 開発ワークフロー

このプロジェクトは2環境構成を採用しており、変更を本番環境にデプロイする前にPreview環境でテストできます。

## 環境構成

### Preview環境（開発・テスト用）
- **ブランチ**: `develop`
- **Vercel環境**: Preview
- **URL**: `https://my-mcp-test-git-develop-*.vercel.app`
- **用途**: 新機能の開発とテスト
- **自動デプロイ**: `develop`ブランチへのpush時

### Production環境（本番）
- **ブランチ**: `main`
- **Vercel環境**: Production
- **URL**: `https://my-mcp-test.vercel.app`
- **用途**: 安定版のリリース
- **自動デプロイ**: `main`ブランチへのpush時（通常はPRマージ経由）

## 日常的な開発フロー

### 1. 新機能の開発開始

```bash
# developブランチに切り替え
git checkout develop

# 最新の状態に更新
git pull origin develop

# 機能ブランチを作成（オプション）
git checkout -b feature/新機能名
```

### 2. コードの変更とテスト

```bash
# ローカル開発サーバーで開発
npm run dev

# コードを変更...

# ローカルでビルドテスト
npm run build

# 変更をコミット
git add .
git commit -m "feat: 新機能を追加"
```

### 3. Preview環境でテスト

```bash
# developブランチにプッシュ
git push origin develop

# または、機能ブランチからdevelopにマージ
git checkout develop
git merge feature/新機能名
git push origin develop
```

プッシュすると：
1. Vercelが自動的にPreview環境にデプロイ
2. GitHubのコミットページにデプロイURLが表示される
3. Preview環境で動作確認

### 4. 本番環境へのデプロイ

変更がPreview環境で問題なく動作することを確認したら：

```bash
# GitHub上でPull Requestを作成
# develop → main

# PRをレビュー（セルフレビュー）：
# - 変更内容を確認
# - デプロイログにエラーがないか確認
# - Preview環境で最終テスト

# 問題なければPRをマージ
# → mainブランチへの自動デプロイが開始
```

### 5. 本番環境の確認

```bash
# mainブランチに切り替えて最新を取得
git checkout main
git pull origin main

# 本番環境で動作確認
# https://my-mcp-test.vercel.app
```

## 環境変数の管理

### ローカル開発
```bash
# 開発環境の環境変数を使用
npm run env:dev
npm run dev
```

### Preview環境（Vercel）
- `.env.preview`の内容を参考に、Vercelダッシュボードで設定
- または`vercel env`コマンドで設定

### Production環境（Vercel）
- `.env.production`の内容を参考に、Vercelダッシュボードで設定
- または`vercel env`コマンドで設定

## トラブルシューティング

### 自動デプロイが始まらない
1. GitHubとVercelの連携を確認
2. Vercelダッシュボードで該当ブランチが認識されているか確認
3. 空コミットでプッシュしてみる：
   ```bash
   git commit --allow-empty -m "chore: trigger deployment"
   git push
   ```

### Preview環境のURLがわからない
1. GitHubのコミットページを確認（Vercelのステータスチェックにリンクあり）
2. Vercelダッシュボードの「Deployments」タブを確認
3. `vercel ls`コマンドで最新のデプロイを確認

### 環境変数が反映されない
1. Vercelダッシュボードで環境変数が正しく設定されているか確認
2. 環境変数を変更した場合は再デプロイが必要
3. `NEXT_PUBLIC_*`で始まる変数はビルド時に埋め込まれるため、変更後は必ず再ビルド

## ベストプラクティス

1. **小さく頻繁にコミット**: 変更を小さな単位でコミットし、Preview環境で確認
2. **PRで確認**: 本番デプロイ前に必ずPRを作成してセルフレビュー
3. **段階的なデプロイ**: 大きな変更は複数のPRに分割
4. **ロールバック準備**: 問題があった場合、mainブランチを前のコミットに戻してプッシュ

## 緊急時のロールバック

本番環境で問題が発生した場合：

```bash
# mainブランチに切り替え
git checkout main

# 最新の状態を取得
git pull origin main

# 前の安定版コミットに戻す（コミットハッシュを指定）
git revert <問題のあるコミットハッシュ>

# または、強制的に前の状態に戻す（注意！）
git reset --hard <安全なコミットハッシュ>
git push --force origin main

# Vercelが自動的に前の状態をデプロイ
```

**注意**: `git push --force`は履歴を書き換えるため、個人開発でのみ使用してください。
