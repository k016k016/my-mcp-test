// レート制限機能
// Upstash Redisを使用してAPIリクエストのレート制限を実装
'use server'

import { redis } from '@/lib/redis'

/**
 * レート制限の設定オプション
 */
export interface RateLimitOptions {
  /**
   * 期間内の最大リクエスト数
   * @default 10
   */
  limit?: number

  /**
   * 期間（秒）
   * @default 60
   */
  window?: number

  /**
   * 識別子のプレフィックス
   * @default 'rate_limit'
   */
  prefix?: string
}

/**
 * レート制限の結果
 */
export interface RateLimitResult {
  /**
   * リクエストが許可されたかどうか
   */
  success: boolean

  /**
   * 期間内の現在のリクエスト数
   */
  current: number

  /**
   * 最大リクエスト数
   */
  limit: number

  /**
   * 次のリセットまでの秒数
   */
  resetIn: number

  /**
   * エラーメッセージ（successがfalseの場合）
   */
  error?: string
}

/**
 * レート制限をチェック
 *
 * @param identifier - 識別子（例: メールアドレス、IPアドレス、ユーザーID）
 * @param options - レート制限のオプション
 * @returns レート制限の結果
 *
 * @example
 * ```ts
 * const result = await rateLimit('user@example.com', { limit: 5, window: 300 })
 * if (!result.success) {
 *   return { error: result.error }
 * }
 * ```
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { limit = 10, window = 60, prefix = 'rate_limit' } = options

  try {
    const key = `${prefix}:${identifier}`

    // Redisが設定されていない場合はレート制限をスキップ
    if (!redis) {
      console.warn('⚠️  Redis未設定のため、レート制限をスキップしています')
      return {
        success: true,
        current: 1,
        limit,
        resetIn: window,
      }
    }

    // 現在のカウントを取得してインクリメント
    const current = await redis.incr(key)

    // 最初のリクエストの場合は有効期限を設定
    if (current === 1) {
      await redis.expire(key, window)
    }

    // 残りの有効期限を取得
    const ttl = await redis.ttl(key)
    const resetIn = ttl > 0 ? ttl : window

    // 制限を超えているかチェック
    if (current > limit) {
      return {
        success: false,
        current,
        limit,
        resetIn,
        error: `リクエスト数が制限を超えました。${resetIn}秒後に再試行してください。`,
      }
    }

    return {
      success: true,
      current,
      limit,
      resetIn,
    }
  } catch (error) {
    // Redis接続エラーの場合はレート制限をスキップ
    console.error('レート制限のチェック中にエラーが発生しました:', error)
    return {
      success: true,
      current: 1,
      limit,
      resetIn: window,
    }
  }
}

/**
 * スライディングウィンドウ方式のレート制限
 * より正確なレート制限が必要な場合に使用
 *
 * @param identifier - 識別子
 * @param options - レート制限のオプション
 * @returns レート制限の結果
 */
export async function rateLimitSlidingWindow(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { limit = 10, window = 60, prefix = 'rate_limit_sw' } = options

  try {
    if (!redis) {
      console.warn('⚠️  Redis未設定のため、レート制限をスキップしています')
      return {
        success: true,
        current: 1,
        limit,
        resetIn: window,
      }
    }

    const key = `${prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - window * 1000

    // ウィンドウ外のエントリを削除
    await redis.zremrangebyscore(key, 0, windowStart)

    // 現在のウィンドウ内のリクエスト数を取得
    const current = await redis.zcard(key)

    if (current >= limit) {
      // 最も古いエントリの時刻を取得してリセット時間を計算
      const oldest = await redis.zrange(key, 0, 0, { withScores: true })
      const oldestScore = oldest.length > 0 ? oldest[0].score : now
      const resetIn = Math.ceil((oldestScore + window * 1000 - now) / 1000)

      return {
        success: false,
        current,
        limit,
        resetIn: Math.max(0, resetIn),
        error: `リクエスト数が制限を超えました。${Math.max(0, resetIn)}秒後に再試行してください。`,
      }
    }

    // 新しいリクエストを記録
    await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` })

    // キーの有効期限を設定（ウィンドウサイズ + 余裕）
    await redis.expire(key, window + 10)

    return {
      success: true,
      current: current + 1,
      limit,
      resetIn: window,
    }
  } catch (error) {
    console.error('スライディングウィンドウレート制限のチェック中にエラーが発生しました:', error)
    return {
      success: true,
      current: 1,
      limit,
      resetIn: window,
    }
  }
}

/**
 * レート制限をリセット
 *
 * @param identifier - 識別子
 * @param prefix - プレフィックス
 */
export async function resetRateLimit(identifier: string, prefix = 'rate_limit'): Promise<void> {
  try {
    if (!redis) return

    const key = `${prefix}:${identifier}`
    await redis.del(key)
  } catch (error) {
    console.error('レート制限のリセット中にエラーが発生しました:', error)
  }
}

// ============================================================================
// プリセット: よく使うレート制限の設定
// ============================================================================

/**
 * ログイン試行のレート制限
 * メールアドレスごとに5回/5分
 */
export async function rateLimitLogin(email: string): Promise<RateLimitResult> {
  return rateLimit(`login:${email}`, {
    limit: 5,
    window: 300, // 5分
    prefix: 'rl',
  })
}

/**
 * パスワードリセットのレート制限
 * メールアドレスごとに3回/時間
 */
export async function rateLimitPasswordReset(email: string): Promise<RateLimitResult> {
  return rateLimit(`password_reset:${email}`, {
    limit: 3,
    window: 3600, // 1時間
    prefix: 'rl',
  })
}

/**
 * メンバー招待のレート制限
 * 組織ごとに10回/時間
 */
export async function rateLimitInvitation(organizationId: string): Promise<RateLimitResult> {
  return rateLimit(`invitation:${organizationId}`, {
    limit: 10,
    window: 3600, // 1時間
    prefix: 'rl',
  })
}

/**
 * API呼び出しのレート制限
 * ユーザーごとに100回/分
 */
export async function rateLimitApi(userId: string): Promise<RateLimitResult> {
  return rateLimit(`api:${userId}`, {
    limit: 100,
    window: 60, // 1分
    prefix: 'rl',
  })
}

/**
 * IPアドレスベースのレート制限
 * IPアドレスごとに20回/分
 */
export async function rateLimitByIp(ipAddress: string): Promise<RateLimitResult> {
  return rateLimit(`ip:${ipAddress}`, {
    limit: 20,
    window: 60, // 1分
    prefix: 'rl',
  })
}
