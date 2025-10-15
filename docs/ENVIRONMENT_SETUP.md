# 環境設定ガイド

このプロジェクトでは、開発環境、Preview環境、本番環境の3つの環境を分けて管理しています。

## 環境の種類

### 1. 開発環境 (Development)
- **用途**: ローカル開発、機能開発、デバッグ
- **ドメイン**: `localhost:3000` / `app.localhost:3000` など
- **データベース**: 開発用Supabaseプロジェクト
- **外部サービス**: テストモード/開発用インスタンス

### 2. Preview環境 (Preview)
- **用途**: 本番デプロイ前のテスト、QA、統合テスト
- **Vercel環境**: Preview（developブランチ）
- **ドメイン**: `my-mcp-test-git-develop-*.vercel.app`
- **データベース**: Preview用Supabaseプロジェクト
- **外部サービス**: テストモード/Preview用インスタンス

### 3. 本番環境 (Production)
- **用途**: 実際のユーザー向けサービス
- **Vercel環境**: Production（mainブランチ）
- **ドメイン**: `my-mcp-test.vercel.app`（カスタムドメイン設定可能）
- **データベース**: 本番用Supabaseプロジェクト
- **外部サービス**: 本番モード/本番用インスタンス

## 環境変数ファイル

各環境用の環境変数ファイルを用意しています：

- `.env.development` - 開発環境用（localhost）
- `.env.preview` - Preview環境用（Vercel Preview）
- `.env.production` - 本番環境用（Vercel Production）
- `.env.local` - ローカル環境で実際に使用される（gitignore対象）

## ローカル開発での環境切り替え

### 方法1: npmスクリプトで切り替え

```bash
# 開発環境に切り替え（通常はこれを使用）
npm run env:dev

# Preview環境に切り替え
npm run env:preview

# 本番環境に切り替え（注意！ローカルでは非推奨）
npm run env:production
```

これらのコマンドは、対応する `.env.*` ファイルを `.env.local` にコピーします。

### 方法2: 直接コピー

```bash
# 開発環境
cp .env.development .env.local

# Preview環境
cp .env.preview .env.local

# 本番環境
cp .env.production .env.local
```

### 方法3: env-cmdを使用（一時的な切り替え）

```bash
# Preview環境でビルド
npm run build:preview

# Preview環境で開発サーバー起動
npm run dev:preview
```

## Vercelでの環境設定

### 1. 環境の作成

Vercelでは以下の環境が自動的に作成されます：

- **Production**: `main`ブランチから自動デプロイ
- **Preview**: `develop`ブランチ（またはその他のブランチ）から自動デプロイ
- **Development**: ローカル開発用（`vercel dev`コマンド使用時）

### 2. 環境変数の設定

Vercelダッシュボードで各環境の環境変数を設定：

1. プロジェクト設定 > Environment Variables に移動
2. 各変数を追加し、適用する環境を選択：
   - **Production**: 本番環境のみ（mainブランチ）
   - **Preview**: Preview環境のみ（develop等のブランチ）
   - **Development**: ローカル開発環境のみ

### 3. ドメインの設定

#### Production環境
```
my-mcp-test.vercel.app（デフォルト）
または
www.yourdomain.com（カスタムドメイン）
app.yourdomain.com
admin.yourdomain.com
ops.yourdomain.com
```

#### Preview環境
```
my-mcp-test-git-develop-*.vercel.app（自動生成）
```

**注意**: Vercelのデフォルトドメイン（*.vercel.app）ではサブドメインが使用できません。
マルチドメイン機能を使用するには、カスタムドメインの設定が必要です。

### 4. ブランチ戦略

```
main (本番 → Vercel Production)
  └── develop (テスト → Vercel Preview)
      └── feature/* (機能ブランチ → ローカル開発)
```

## 環境ごとの設定チェックリスト

### 開発環境

- [ ] Supabase開発用プロジェクトを作成
- [ ] `.env.development` に開発用の認証情報を設定
- [ ] `.env.local` にコピー（`npm run env:dev`）
- [ ] ローカルホストのドメイン設定を確認
- [ ] Sentryを無効化（開発中のエラーログを避ける）

### Preview環境

- [ ] SupabasePreview用プロジェクトを作成（または開発用を共有）
- [ ] Cloudflare R2 Preview用バケットを作成（または開発用を共有）
- [ ] Upstash Redis Preview用インスタンスを作成（または開発用を共有）
- [ ] `.env.preview` に認証情報を設定
- [ ] Vercel環境変数で「Preview」環境に設定
- [ ] developブランチを作成・push
- [ ] データベースマイグレーションを実行

### 本番環境

- [ ] Supabase本番用プロジェクトを作成
- [ ] Cloudflare R2本番用バケットを作成
- [ ] Upstash Redis本番用インスタンスを作成
- [ ] Sentry本番プロジェクトを作成
- [ ] Chargebeeを本番モードに設定
- [ ] Resend本番用APIキーを取得
- [ ] `.env.production` に認証情報を設定
- [ ] Vercelで本番環境を設定
- [ ] 本番ドメインを設定
- [ ] データベースマイグレーションを実行
- [ ] OPS_ALLOWED_IPsを正しく設定
- [ ] SSL証明書を確認

## 環境識別

アプリケーション内で現在の環境を識別する方法：

```typescript
// 環境を取得
const env = process.env.NEXT_PUBLIC_ENV // 'development' | 'preview' | 'production'

// 環境別の処理
if (env === 'production') {
  // 本番環境のみの処理
}

if (env === 'preview') {
  // Preview環境のみの処理
}

if (env === 'development') {
  // 開発環境のみの処理
}
```

## よくある質問

### Q: `.env.local` と `.env.development` の違いは？

A: `.env.development` はテンプレートで、`.env.local` は実際に使用されるファイルです。`.env.local` は gitignore されているため、機密情報を含めることができます。

### Q: Preview環境でも本番と同じデータベースを使える？

A: **推奨しません**。Preview環境と本番環境は完全に分離すべきです。テストデータが本番環境に影響を与えるリスクを避けるため、別のSupabaseプロジェクトを使用してください。ただし、個人開発の初期段階では、Preview環境と開発環境で同じデータベースを共有することは許容されます。

### Q: 環境変数を変更したらどうする？

A:
- ローカル: サーバーを再起動（`.env.local` の変更を反映）
- Vercel: 自動的に次のデプロイから反映される

### Q: 環境変数が反映されない

A:
1. `.env.local` ファイルが存在するか確認
2. サーバーを再起動
3. キャッシュをクリア（`.next` フォルダを削除）
4. `NEXT_PUBLIC_` プレフィックスが必要な変数か確認

## セキュリティに関する注意

1. **絶対に `.env.local` をコミットしない**
2. **本番環境の環境変数をローカルで使用しない**
3. **APIキーやシークレットは環境変数で管理**
4. **OPS_ALLOWED_IPsは本番環境で必ず設定**
5. **定期的にAPIキーをローテーション**

## トラブルシューティング

### 問題: 環境変数が読み込まれない

```bash
# キャッシュをクリア
rm -rf .next
npm run dev
```

### 問題: 環境を間違えてデプロイした

1. Vercelダッシュボードでデプロイメントをロールバック
2. 正しいブランチから再デプロイ
3. 環境変数を再確認

### 問題: マルチドメインが動作しない

1. Vercelでドメイン設定を確認
2. DNS設定を確認
3. `NEXT_PUBLIC_*_URL` 環境変数を確認

## 参考リンク

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Projects](https://supabase.com/docs/guides/platform/projects)
