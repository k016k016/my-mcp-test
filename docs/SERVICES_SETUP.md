# 外部サービス統合ガイド

このガイドでは、Sentry、Chargebee、Resendの3つのサービスの設定方法と使用方法を説明します。

## 📑 目次

1. [Sentry - エラー監視](#sentry---エラー監視)
2. [Chargebee - サブスクリプション決済](#chargebee---サブスクリプション決済)
3. [Resend - メール送信](#resend---メール送信)

---

## Sentry - エラー監視

Sentryは、エラー追跡とパフォーマンス監視のためのサービスです。

### セットアップ手順

1. **Sentryアカウントを作成**
   - [https://sentry.io](https://sentry.io)でアカウントを作成

2. **プロジェクトを作成**
   - 「Create Project」をクリック
   - プラットフォームとして「Next.js」を選択
   - プロジェクト名を入力

3. **DSNを取得**
   - プロジェクト設定から「Client Keys (DSN)」を取得

4. **環境変数を設定**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-name
   SENTRY_AUTH_TOKEN=your-auth-token
   ```

### 使用方法

#### エラーを手動でキャプチャ

\`\`\`typescript
import * as Sentry from '@sentry/nextjs'

try {
  // エラーが発生する可能性のあるコード
  throw new Error('何かがおかしい')
} catch (error) {
  Sentry.captureException(error)
}
\`\`\`

#### カスタムメッセージを送信

\`\`\`typescript
Sentry.captureMessage('重要なイベントが発生しました', 'info')
\`\`\`

#### ユーザーコンテキストを設定

\`\`\`typescript
Sentry.setUser({
  id: 'user123',
  email: 'user@example.com',
  username: 'john_doe',
})
\`\`\`

#### カスタムタグを追加

\`\`\`typescript
Sentry.setTag('page_locale', 'ja-JP')
Sentry.setTag('feature_flag', 'new_design')
\`\`\`

### 料金

- **無料プラン**: 5,000エラー/月
- **有料プラン**: $26/月〜（50,000エラー/月）

---

## Chargebee - サブスクリプション決済

Chargebeeは、サブスクリプション管理と請求のためのプラットフォームです。

### セットアップ手順

1. **Chargebeeアカウントを作成**
   - [https://www.chargebee.com](https://www.chargebee.com)でアカウントを作成

2. **サイトを作成**
   - サイト名（site name）を設定

3. **APIキーを取得**
   - Settings → Configure Chargebee → API Keys
   - 「API Key」と「Publishable Key」を取得

4. **環境変数を設定**
   ```bash
   CHARGEBEE_SITE=your-site-name
   CHARGEBEE_API_KEY=your-api-key
   NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY=your-publishable-key
   ```

### 使用方法

#### 顧客を作成

\`\`\`typescript
import { createCustomer } from '@/lib/chargebee'

const customer = await createCustomer({
  email: 'customer@example.com',
  first_name: '太郎',
  last_name: '山田',
})
\`\`\`

#### サブスクリプションを作成

\`\`\`typescript
import { createSubscription } from '@/lib/chargebee'

const subscription = await createSubscription({
  customer_id: 'customer_123',
  plan_id: 'basic-plan',
})
\`\`\`

#### ホストされたチェックアウトページを作成

\`\`\`typescript
import { createHostedPage } from '@/lib/chargebee'

const hostedPage = await createHostedPage({
  type: 'checkout_new',
  customer: {
    email: 'customer@example.com',
    first_name: '太郎',
  },
  subscription: {
    plan_id: 'basic-plan',
  },
  redirect_url: 'https://yoursite.com/success',
})

// ユーザーをチェックアウトページにリダイレクト
window.location.href = hostedPage.url
\`\`\`

#### サブスクリプションをキャンセル

\`\`\`typescript
import { cancelSubscription } from '@/lib/chargebee'

const subscription = await cancelSubscription('subscription_id', {
  end_of_term: true, // 期間終了時にキャンセル
})
\`\`\`

### 料金

- **スタータープラン**: 無料（最初の$100K収益まで）
- **成長プラン**: 月間収益の0.75%

---

## Resend - メール送信

Resendは、開発者向けのモダンなメール送信APIです。

### セットアップ手順

1. **Resendアカウントを作成**
   - [https://resend.com](https://resend.com)でアカウントを作成

2. **ドメインを認証**
   - ダッシュボードで「Add Domain」
   - DNSレコードを設定（SPF、DKIM、DMARC）

3. **APIキーを取得**
   - 「API Keys」から新しいキーを作成

4. **環境変数を設定**
   ```bash
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### 使用方法

#### 基本的なメール送信

\`\`\`typescript
import { sendEmail } from '@/lib/resend'

await sendEmail({
  to: 'recipient@example.com',
  subject: 'こんにちは',
  html: '<h1>こんにちは！</h1><p>これはテストメールです。</p>',
})
\`\`\`

#### ウェルカムメールを送信

\`\`\`typescript
import { sendWelcomeEmail } from '@/lib/resend'

await sendWelcomeEmail({
  to: 'newuser@example.com',
  name: '太郎',
})
\`\`\`

#### パスワードリセットメールを送信

\`\`\`typescript
import { sendPasswordResetEmail } from '@/lib/resend'

await sendPasswordResetEmail({
  to: 'user@example.com',
  resetUrl: 'https://yoursite.com/reset-password?token=abc123',
})
\`\`\`

#### 添付ファイル付きメールを送信

\`\`\`typescript
import { sendEmail } from '@/lib/resend'
import fs from 'fs'

await sendEmail({
  to: 'recipient@example.com',
  subject: '請求書',
  html: '<p>請求書を添付しました。</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: fs.readFileSync('./invoice.pdf'),
      content_type: 'application/pdf',
    },
  ],
})
\`\`\`

#### React Emailと組み合わせて使用

\`\`\`typescript
import { sendTemplateEmail } from '@/lib/resend'
import { WelcomeEmail } from '@/emails/welcome'

await sendTemplateEmail({
  to: 'user@example.com',
  subject: 'ようこそ！',
  react: <WelcomeEmail name="太郎" />,
})
\`\`\`

### 料金

- **無料プラン**: 100メール/日、3,000メール/月
- **有料プラン**: $20/月（50,000メール/月）

---

## まとめ

| サービス | 用途 | 料金（無料枠） |
|---------|------|----------------|
| **Sentry** | エラー監視 | 5,000エラー/月 |
| **Chargebee** | サブスクリプション決済 | $100K収益まで |
| **Resend** | メール送信 | 3,000メール/月 |

これらのサービスを組み合わせることで、プロダクション環境に必要な機能を網羅できます：

- エラーの検知と修正（Sentry）
- サブスクリプション管理（Chargebee）
- トランザクショナルメール（Resend）

詳細な使用方法については、各サービスの公式ドキュメントを参照してください。
