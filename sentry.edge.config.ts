// Sentry Edge設定（Middleware用）
import * as Sentry from '@sentry/nextjs'

// DSNが有効な場合のみSentryを初期化
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn && dsn.startsWith('https://')) {
  Sentry.init({
    dsn,

    // パフォーマンス監視のサンプリングレート（0.0 ~ 1.0）
    tracesSampleRate: 1.0,

    // デバッグモード（開発時のみ）
    debug: false,

    // 環境名
    environment: process.env.NODE_ENV,
  })
}
