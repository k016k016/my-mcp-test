# マルチドメインセットアップガイド

このガイドでは、4つのドメインを持つマルチドメイン構成のセットアップ方法を説明します。

## 📑 ドメイン構成

| ドメイン | 用途 | 説明 |
|---------|------|------|
| **www.example.com** | マーケティングサイト | 公開Webサイト、ランディングページ |
| **app.example.com** | ユーザーアプリケーション | ログイン後のメインアプリ |
| **admin.example.com** | 管理画面 | 管理者向けダッシュボード |
| **ops.example.com** | 運用画面 | 運用チーム向けツール |

## 🏗️ プロジェクト構成

### ディレクトリ構造

\`\`\`
src/
├── app/
│   ├── (www)/          # WWWドメイン用ページ
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (app)/          # APPドメイン用ページ
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (admin)/        # ADMINドメイン用ページ
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── (ops)/          # OPSドメイン用ページ
│       ├── layout.tsx
│       └── page.tsx
├── lib/
│   └── domains/
│       ├── config.ts   # ドメイン設定
│       ├── helpers.ts  # ヘルパー関数
│       └── index.ts
└── middleware.ts       # ドメインルーティング
\`\`\`

### ルートグループの使用

Next.jsの**ルートグループ**（`(グループ名)`）を使用して、各ドメインのページを整理しています。
`(www)`, `(app)`, `(admin)`, `(ops)`は、URLには含まれません。

## 🔧 開発環境でのセットアップ

### 1. hostsファイルの編集（必須）

⚠️ **重要**: サブドメイン間のCookie共有には、`.local.test`のような適切なドメインが必須です。

**なぜ`.local.test`を使うのか**：
- `localhost`ではサブドメイン間のCookie共有ができない（ブラウザの制限）
- `.localhost`も一部ブラウザでCookie共有に問題がある
- `.local.test`は開発用に推奨されるローカルドメイン
- 環境変数`NEXT_PUBLIC_COOKIE_DOMAIN=.local.test`と連携して動作

**hostsファイルの編集手順**：

\`\`\`bash
sudo nano /etc/hosts
\`\`\`

以下の行を追加：

\`\`\`
127.0.0.1 local.test
127.0.0.1 www.local.test
127.0.0.1 app.local.test
127.0.0.1 admin.local.test
127.0.0.1 ops.local.test
\`\`\`

保存して終了（Ctrl+O → Enter → Ctrl+X）

**注意**：
- `local.test`のベースドメインも必ず追加すること
- これがないと`.local.test`のCookieが正しく動作しません

### 2. 環境変数の設定

`.env.local`ファイルで以下を設定：

\`\`\`bash
# マルチドメイン設定
NEXT_PUBLIC_WWW_URL=http://www.local.test:3000
NEXT_PUBLIC_APP_URL=http://app.local.test:3000
NEXT_PUBLIC_ADMIN_URL=http://admin.local.test:3000
NEXT_PUBLIC_OPS_URL=http://ops.local.test:3000

# Cookie共有用のドメイン設定（重要！）
NEXT_PUBLIC_COOKIE_DOMAIN=.local.test
\`\`\`

### 3. 開発サーバーを起動

\`\`\`bash
npm run dev
\`\`\`

### 4. 各ドメインにアクセス

- **WWW**: http://www.local.test:3000
- **APP**: http://app.local.test:3000
- **ADMIN**: http://admin.local.test:3000
- **OPS**: http://ops.local.test:3000

## 🌐 本番環境でのセットアップ

### 1. DNSレコードの設定

ドメインのDNS設定で、以下のレコードを追加：

\`\`\`
A    @      your-server-ip
A    www    your-server-ip
A    app    your-server-ip
A    admin  your-server-ip
A    ops    your-server-ip
\`\`\`

またはCNAMEレコード（Vercelなど）:

\`\`\`
CNAME www    your-app.vercel.app
CNAME app    your-app.vercel.app
CNAME admin  your-app.vercel.app
CNAME ops    your-app.vercel.app
\`\`\`

### 2. 環境変数の設定

\`\`\`.env.production
NEXT_PUBLIC_WWW_URL=https://www.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_ADMIN_URL=https://admin.example.com
NEXT_PUBLIC_OPS_URL=https://ops.example.com
\`\`\`

### 3. Vercelでのデプロイ

Vercelを使用する場合：

1. プロジェクトをGitリポジトリにプッシュ
2. Vercelにインポート
3. 「Domains」設定で以下のドメインを追加:
   - www.example.com
   - app.example.com
   - admin.example.com
   - ops.example.com

## 💻 使用方法

### ドメインを取得する

\`\`\`typescript
import { getCurrentDomain, isAppDomain } from '@/lib/domains'

// Server Component内で
export default async function MyPage() {
  const domain = await getCurrentDomain()
  console.log('現在のドメイン:', domain) // 'www', 'app', 'admin', 'ops'

  const isApp = await isAppDomain()
  if (isApp) {
    // APPドメイン特有の処理
  }

  return <div>...</div>
}
\`\`\`

### ドメイン間でリンクを生成

\`\`\`typescript
import { domainUrls } from '@/lib/domains'

export default function MyComponent() {
  return (
    <div>
      <a href={domainUrls.www('/')}>マーケティングサイトへ</a>
      <a href={domainUrls.app('/dashboard')}>アプリへ</a>
      <a href={domainUrls.admin('/users')}>管理画面へ</a>
      <a href={domainUrls.ops('/monitoring')}>運用画面へ</a>
    </div>
  )
}
\`\`\`

### ドメインごとの認証制御

```typescript
// src/middleware.ts
import { getDomainFromHost, DOMAINS } from '@/lib/domains/config'
import { createClient } from '@/lib/supabase/server'
import { isOpsUser, hasAdminAccess } from '@/lib/auth/permissions'

export async function middleware(request: NextRequest) {
  const domain = getDomainFromHost(host)

  // 認証が必要なドメインの認証チェック
  if (domain === DOMAINS.APP || domain === DOMAINS.ADMIN || domain === DOMAINS.OPS) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // 未認証の場合、適切なログインページへリダイレクト
      const loginUrl = domain === DOMAINS.OPS
        ? '/login'  // OPSは独自ログイン
        : `${process.env.NEXT_PUBLIC_WWW_URL}/login`
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }

    // OPSドメインの場合は運用担当者権限チェック
    if (domain === DOMAINS.OPS) {
      const hasOpsAccess = await isOpsUser(user)
      if (!hasOpsAccess) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WWW_URL}/login`)
      }
    }

    // ADMINドメインの場合は管理者権限チェック
    if (domain === DOMAINS.ADMIN) {
      const hasAdminPermission = await hasAdminAccess(user)
      if (!hasAdminPermission) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?message=管理者権限がありません`)
      }
    }
  }

  // 通常の処理を続行
  return response
}
```

## 🎨 ドメインごとのスタイリング

各ドメインで異なるデザインを使用できます：

### WWWドメイン（マーケティング）
- 白ベースの明るいデザイン
- 大きなヒーロー画像
- CTAボタンが目立つ

### APPドメイン（ユーザーアプリ）
- グレーベースの落ち着いたデザイン
- ダッシュボード風のレイアウト
- データの可視化

### ADMINドメイン（管理画面）
- ダークグレーのサイドバー
- テーブル中心のレイアウト
- 統計情報のダッシュボード

### OPSドメイン（運用画面）
- ダークモード
- ターミナル風のデザイン
- リアルタイム監視UI

## 📊 ドメイン設定のカスタマイズ

\`\`\`typescript
// src/lib/domains/config.ts

export const DOMAIN_CONFIG = {
  [DOMAINS.WWW]: {
    name: 'メインサイト',
    description: '公開Webサイト',
    baseUrl: process.env.NEXT_PUBLIC_WWW_URL,
    requireAuth: false,
    theme: 'light',
  },
  [DOMAINS.APP]: {
    name: 'アプリケーション',
    description: 'ユーザー向けアプリ',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL,
    requireAuth: true,
    allowedRoles: ['owner', 'admin', 'member'], // 組織ベースのロール
    theme: 'light',
  },
  [DOMAINS.ADMIN]: {
    name: '管理画面',
    description: '組織管理者向け',
    baseUrl: process.env.NEXT_PUBLIC_ADMIN_URL,
    requireAuth: true,
    allowedRoles: ['owner', 'admin'], // 組織内の管理者のみ
    theme: 'admin',
  },
  [DOMAINS.OPS]: {
    name: '運用画面',
    description: '運用担当者向け',
    baseUrl: process.env.NEXT_PUBLIC_OPS_URL,
    requireAuth: true,
    requireOpsAccess: true, // user_metadata.is_ops = true が必要
    theme: 'dark',
  },
}
\`\`\`

## 🔐 セキュリティのベストプラクティス

### 1. CSRFトークンの共有

異なるドメイン間でのフォーム送信には、適切なCSRF対策を実装してください。

### 2. Cookieのドメイン設定

\`\`\`typescript
// 全サブドメインで共有する場合
res.cookies.set('session', token, {
  domain: '.example.com', // 先頭のドットに注意
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
})
\`\`\`

### 3. CORSの設定

異なるドメイン間でAPIを呼び出す場合、適切なCORS設定を行ってください。

## 🚀 パフォーマンス最適化

### 1. 静的ファイルの共有

静的アセット（画像、CSSなど）は、すべてのドメインから参照可能にします。

### 2. CDNの活用

CloudflareやCloudFrontなどのCDNを使用して、各ドメインで高速な配信を実現します。

### 3. ドメインごとのキャッシュ戦略

\`\`\`typescript
// WWWドメイン: 長いキャッシュ
export const revalidate = 3600 // 1時間

// APPドメイン: 短いキャッシュ
export const revalidate = 60 // 1分
\`\`\`

## 🧪 テスト

### ドメインごとのE2Eテスト

\`\`\`typescript
// tests/www.spec.ts
test('WWWドメインのトップページ', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveTitle(/Welcome/)
})

// tests/app.spec.ts
test('APPドメインのダッシュボード', async ({ page }) => {
  await page.goto('http://app.localhost:3000')
  await expect(page).toHaveTitle(/Dashboard/)
})
\`\`\`

## トラブルシューティング

### ローカルでサブドメインが動かない

- `/etc/hosts`ファイルが正しく編集されているか確認
  - `local.test`のベースドメインも必須
  - `cat /etc/hosts | grep local.test`で確認
- `.env.local`の`NEXT_PUBLIC_COOKIE_DOMAIN=.local.test`が設定されているか確認
- ブラウザのキャッシュとCookieをクリア
- 開発サーバーを再起動

### Cookie共有ができない

- 環境変数`NEXT_PUBLIC_COOKIE_DOMAIN`が`.local.test`（先頭にドット）になっているか確認
- `localhost`を使っていないか確認（Cookie共有不可）
- ブラウザの開発者ツールでCookieのドメイン設定を確認

### 本番環境でドメインが表示されない

- DNSレコードが正しく設定されているか確認（`dig`コマンドなどで確認）
- DNS伝播に最大48時間かかる場合があります
- SSL証明書が各ドメインで有効になっているか確認

### Middlewareでドメインが正しく判定されない

- `x-forwarded-host`ヘッダーを確認
- プロキシやロードバランサーの設定を確認

## 参考リンク

- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Multi-Domain Setup](https://vercel.com/docs/concepts/projects/domains)
