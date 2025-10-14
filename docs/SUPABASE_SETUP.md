# Supabase セットアップガイド

このガイドでは、SupabaseのAuthとPostgreSQL + PostGISを使用するための設定手順を説明します。

## 前提条件

- Supabaseアカウント（[https://supabase.com](https://supabase.com)で作成）
- プロジェクトの作成

## 1. 環境変数の設定

`.env.local`ファイルにSupabaseの認証情報を設定します：

1. [Supabaseダッシュボード](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. 左側メニューから「Settings」→「API」を選択
4. 以下の値をコピーして`.env.local`に貼り付け:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://qtjcoffmwmqgfdqimlis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amNvZmZtd21xZ2ZkcWltbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MDgzMzcsImV4cCI6MjA3NTk4NDMzN30.Ax41_ZA8p-eMmIT0i_BxRp98X3yquTVujYIes5X3BbQ
\`\`\`

## 2. プロジェクト構成

以下のファイルが作成されています：

### Supabaseクライアント

- **src/lib/supabase/client.ts**: ブラウザ側（Client Components）で使用
- **src/lib/supabase/server.ts**: サーバー側（Server Components、Server Actions）で使用
- **src/lib/supabase/middleware.ts**: Middleware用のクライアント
- **src/middleware.ts**: Next.js Middleware（認証セッション管理）

### 認証機能

- **src/lib/auth/auth-helpers.ts**: 認証ヘルパー関数
- **src/app/actions/auth.ts**: 認証用Server Actions
- **src/app/auth/callback/route.ts**: OAuth認証後のコールバックハンドラー

## 3. 使用方法

### 3.1 Server Componentでユーザー情報を取得

\`\`\`typescript
import { getCurrentUser } from '@/lib/auth/auth-helpers'

export default async function Page() {
  const user = await getCurrentUser()

  return (
    <div>
      {user ? (
        <p>ようこそ、{user.email}さん</p>
      ) : (
        <p>ログインしていません</p>
      )}
    </div>
  )
}
\`\`\`

### 3.2 認証が必要なページを保護

\`\`\`typescript
import { requireAuth } from '@/lib/auth/auth-helpers'

export default async function ProtectedPage() {
  // ログインしていない場合は自動的に/loginにリダイレクト
  const user = await requireAuth()

  return <div>保護されたページ: {user.email}</div>
}
\`\`\`

### 3.3 Client Componentで認証機能を使用

\`\`\`typescript
'use client'

import { signIn, signOut } from '@/app/actions/auth'

export default function LoginForm() {
  return (
    <form action={signIn}>
      <input name="email" type="email" placeholder="メールアドレス" required />
      <input name="password" type="password" placeholder="パスワード" required />
      <button type="submit">ログイン</button>
    </form>
  )
}
\`\`\`

### 3.4 データベース操作

\`\`\`typescript
import { createClient } from '@/lib/supabase/server'

export default async function DataPage() {
  const supabase = await createClient()

  // データ取得
  const { data, error } = await supabase
    .from('your_table')
    .select('*')

  if (error) {
    console.error('エラー:', error)
    return <div>エラーが発生しました</div>
  }

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
\`\`\`

## 4. 認証プロバイダーの設定

### メール/パスワード認証（デフォルトで有効）

既に使用可能です。

### OAuth認証（Google、GitHubなど）

1. Supabaseダッシュボードの「Authentication」→「Providers」を選択
2. 使用したいプロバイダー（例: Google）を選択
3. プロバイダーの設定ページでClient IDとClient Secretを取得
4. Supabaseに設定を保存
5. Redirect URLを設定:
   - 開発環境: \`http://localhost:3000/auth/callback\`
   - 本番環境: \`https://your-domain.com/auth/callback\`

### 使用例

\`\`\`typescript
import { signInWithGoogle } from '@/app/actions/auth'

export default function LoginPage() {
  return (
    <form action={signInWithGoogle}>
      <button type="submit">Googleでログイン</button>
    </form>
  )
}
\`\`\`

## 5. PostGISの使用

PostGISの詳細な使用方法については、[POSTGIS_SETUP.md](./POSTGIS_SETUP.md)を参照してください。

## 6. Row Level Security (RLS)

Supabaseでは、Row Level Security（行レベルセキュリティ）を使用してデータアクセスを制御します。

### 基本的なポリシーの例

\`\`\`sql
-- テーブルのRLSを有効化
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能
CREATE POLICY "Public read access"
  ON your_table FOR SELECT
  USING (true);

-- 認証済みユーザーのみ作成可能
CREATE POLICY "Authenticated users can insert"
  ON your_table FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 自分のデータのみ更新可能
CREATE POLICY "Users can update own data"
  ON your_table FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分のデータのみ削除可能
CREATE POLICY "Users can delete own data"
  ON your_table FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
\`\`\`

## 7. 便利なコマンド

### 型定義を生成

Supabase CLIを使用してTypeScript型定義を自動生成できます：

\`\`\`bash
# Supabase CLIをインストール
npm install -g supabase

# ログイン
supabase login

# 型定義を生成
supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
\`\`\`

## トラブルシューティング

### 環境変数が読み込まれない

- 開発サーバーを再起動してください
- \`.env.local\`ファイルが正しい場所にあることを確認

### 認証エラー

- Supabaseダッシュボードで認証プロバイダーが有効になっているか確認
- リダイレクトURLが正しく設定されているか確認

### データベース接続エラー

- SupabaseのURLとAPIキーが正しいか確認
- Supabaseプロジェクトが一時停止されていないか確認

## 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase Next.js ガイド](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostGISセットアップガイド](./POSTGIS_SETUP.md)
