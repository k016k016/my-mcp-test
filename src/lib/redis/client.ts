// Upstash Redisクライアント
// HTTP経由でRedisにアクセスするため、サーバーレス環境でも動作します
import { Redis } from '@upstash/redis'

// Redisクライアントのシングルトンインスタンス
let redisClient: Redis | null = null

/**
 * Redisクライアントを取得
 * HTTP REST APIを使用してRedisにアクセスします（サーバーレス対応）
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error(
      'Upstash Redisの環境変数が設定されていません。.env.localファイルを確認してください。'
    )
  }

  redisClient = new Redis({
    url,
    token,
  })

  return redisClient
}

/**
 * Redisクライアントを破棄（テスト用）
 */
export function resetRedisClient(): void {
  redisClient = null
}

/**
 * Redisクライアントのインスタンス（オプショナル）
 * Redisが設定されていない場合はnullを返す
 */
export function getOptionalRedisClient(): Redis | null {
  try {
    return getRedisClient()
  } catch {
    return null
  }
}

// デフォルトエクスポート（後方互換性のため）
export const redis = getOptionalRedisClient()
