// 環境変数の型安全性を確保
// Zodを使用して環境変数をバリデーションし、型安全にアクセス可能にします
import { z } from 'zod'

// 環境変数のスキーマ定義
const envSchema = z.object({
  // マルチドメイン設定
  NEXT_PUBLIC_WWW_URL: z.string().url('WWW URLは有効なURLである必要があります'),
  NEXT_PUBLIC_APP_URL: z.string().url('APP URLは有効なURLである必要があります'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url('ADMIN URLは有効なURLである必要があります'),
  NEXT_PUBLIC_OPS_URL: z.string().url('OPS URLは有効なURLである必要があります'),
  NEXT_PUBLIC_SITE_URL: z.string().url('SITE URLは有効なURLである必要があります').optional(),

  // Supabase設定
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URLは有効なURLである必要があります'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Keyが必要です'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Cloudflare R2設定
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.union([z.string().url(), z.literal('')]).optional(),

  // Upstash Redis設定
  UPSTASH_REDIS_REST_URL: z.union([z.string().url('Redis REST URLは有効なURLである必要があります'), z.literal('')]).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Sentry設定
  NEXT_PUBLIC_SENTRY_DSN: z.union([z.string().url(), z.literal('')]).optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Logflare設定
  NEXT_PUBLIC_LOGFLARE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_LOGFLARE_SOURCE_ID: z.string().optional(),

  // Chargebee設定
  CHARGEBEE_SITE: z.string().optional(),
  CHARGEBEE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY: z.string().optional(),

  // Resend設定
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.union([z.string().email(), z.literal('')]).optional(),

  // OPS IP制限
  OPS_ALLOWED_IPS: z.string().optional(),

  // Node環境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// 環境変数をパースして型安全にエクスポート
// 開発環境では緩やかな検証、本番環境では厳密な検証を行います
function parseEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError && error.errors) {
      console.error('❌ 環境変数の検証エラー:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })

      // 開発環境では警告のみ、本番環境ではエラーをスロー
      if (process.env.NODE_ENV === 'production') {
        throw new Error('環境変数の検証に失敗しました。上記のエラーを確認してください。')
      }

      console.warn('⚠️  開発環境のため続行しますが、環境変数を正しく設定してください。')
    } else {
      console.error('❌ 予期しないエラーが発生しました:', error)
    }

    // エラーが発生した場合でも、型安全性を保つためにデフォルト値を返す
    return process.env as z.infer<typeof envSchema>
  }
}

export const env = parseEnv()

// 型エクスポート
export type Env = z.infer<typeof envSchema>

// ヘルパー関数: 必須の環境変数が設定されているかチェック
export function validateRequiredEnv() {
  const required = [
    'NEXT_PUBLIC_WWW_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_ADMIN_URL',
    'NEXT_PUBLIC_OPS_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ] as const

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `以下の必須環境変数が設定されていません: ${missing.join(', ')}\n` +
        '.env.local ファイルを確認してください。'
    )
  }
}
