// Sentry Edge設定（Middleware用）
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンス監視のサンプリングレート（0.0 ~ 1.0）
  tracesSampleRate: 1.0,

  // デバッグモード（開発時のみ）
  debug: false,

  // 環境名
  environment: process.env.NODE_ENV,
})
