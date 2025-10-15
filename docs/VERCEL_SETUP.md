# Vercelデプロイメントガイド

このドキュメントでは、このプロジェクトをVercelにデプロイする手順を説明します。

## 前提条件

- Vercelアカウント（https://vercel.com）
- Vercel CLI（グローバルにインストール済み）
- Supabaseプロジェクトが設定済み
- `.env.local`ファイルが正しく設定されている

## セットアップ手順

### 1. Vercel CLIにログイン

```bash
vercel login
```

ブラウザが開き、Vercelにログインするよう求められます。

### 2. プロジェクトをVercelにリンク

```bash
vercel link
```

プロンプトに従って以下を選択：
- **Set up and deploy**: `Yes`
- **Which scope**: あなたのVercelアカウントまたはチームを選択
- **Link to existing project**: `No`（新規プロジェクトの場合）
- **Project name**: 任意の名前（例: `my-saas-app`）
- **Directory**: `./`（デフォルト）

これにより、`.vercel`ディレクトリが作成され、プロジェクトの設定が保存されます。

### 3. 環境変数を設定

#### オプションA: スクリプトを使用（推奨）

`.env.local`の内容を自動的にVercelに登録するスクリプトを用意しています：

```bash
# 本番環境に設定
./scripts/setup-vercel-env.sh production

# プレビュー環境に設定
./scripts/setup-vercel-env.sh preview

# 開発環境に設定
./scripts/setup-vercel-env.sh development
```

#### オプションB: 手動で設定

個別に環境変数を追加する場合：

```bash
# 必須の環境変数
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# ドメイン設定（デプロイ後に実際のURLに更新）
vercel env add NEXT_PUBLIC_WWW_URL production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_ADMIN_URL production
vercel env add NEXT_PUBLIC_OPS_URL production

# オプション: 外部サービス
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add CLOUDFLARE_R2_ACCESS_KEY_ID production
# ...その他
```

#### 環境変数の確認

```bash
vercel env ls
```

### 4. 初回デプロイ

```bash
# プレビューデプロイ（テスト用）
vercel

# 本番デプロイ
vercel --prod
```

デプロイが完了すると、URLが表示されます：
```
https://your-project-xxx.vercel.app
```

### 5. マルチドメイン設定

このプロジェクトは4つのサブドメインを使用します。Vercel Dashboardで追加のドメインを設定します。

#### Vercel Dashboardでの設定

1. プロジェクトを開く
2. **Settings** → **Domains**に移動
3. 以下のドメインを追加：

**Vercelの自動ドメインを使用する場合：**
- `your-project.vercel.app`（WWWドメイン - メイン）
- `app-your-project.vercel.app`（APPドメイン）
- `admin-your-project.vercel.app`（ADMINドメイン）
- `ops-your-project.vercel.app`（OPSドメイン）

**カスタムドメインを使用する場合：**
- `yourdomain.com`（WWWドメイン）
- `app.yourdomain.com`（APPドメイン）
- `admin.yourdomain.com`（ADMINドメイン）
- `ops.yourdomain.com`（OPSドメイン）

#### 環境変数のURL更新

ドメインを追加したら、環境変数を実際のURLに更新します：

```bash
# 本番環境のドメインURLを更新
vercel env rm NEXT_PUBLIC_WWW_URL production
echo "https://yourdomain.com" | vercel env add NEXT_PUBLIC_WWW_URL production

vercel env rm NEXT_PUBLIC_APP_URL production
echo "https://app.yourdomain.com" | vercel env add NEXT_PUBLIC_APP_URL production

vercel env rm NEXT_PUBLIC_ADMIN_URL production
echo "https://admin.yourdomain.com" | vercel env add NEXT_PUBLIC_ADMIN_URL production

vercel env rm NEXT_PUBLIC_OPS_URL production
echo "https://ops.yourdomain.com" | vercel env add NEXT_PUBLIC_OPS_URL production
```

または、スクリプトを再実行：
```bash
./scripts/setup-vercel-env.sh production
```

### 6. 再デプロイ

環境変数を更新した後、再デプロイします：

```bash
vercel --prod
```

### 7. Supabaseの設定を更新

Supabase Dashboardで、Vercelのドメインを許可リストに追加します。

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**を本番のWWWドメインに設定：
   ```
   https://yourdomain.com
   ```

3. **Redirect URLs**に以下を追加：
   ```
   https://yourdomain.com/auth/callback
   https://app.yourdomain.com/auth/callback
   ```

## マルチドメインの動作確認

各ドメインが正しく動作するか確認：

1. **WWW** (`https://yourdomain.com`) - マーケティングページ、ログイン、サインアップ
2. **APP** (`https://app.yourdomain.com`) - ユーザーダッシュボード（認証必須）
3. **ADMIN** (`https://admin.yourdomain.com`) - 管理パネル（認証必須）
4. **OPS** (`https://ops.yourdomain.com`) - 運用ダッシュボード（IP制限あり）

## トラブルシューティング

### Cookie共有の問題

localhostとは異なり、本番環境ではサブドメイン間でCookieが正しく共有されます。`domain`オプションを設定していれば、認証状態が各サブドメインで保持されます。

### ビルドエラー

環境変数が正しく設定されているか確認：
```bash
vercel env ls production
```

ローカルでビルドをテスト：
```bash
npm run build
```

### デプロイログの確認

```bash
vercel logs
```

または、Vercel Dashboardの**Deployments**タブでログを確認できます。

## 継続的デプロイメント

Gitリポジトリを接続すると、自動デプロイが有効になります：

1. Vercel Dashboard → **Settings** → **Git**
2. GitHubリポジトリを接続
3. mainブランチへのプッシュで自動的に本番デプロイ
4. プルリクエストごとにプレビューデプロイが作成されます

## 関連ドキュメント

- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase with Vercel](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
