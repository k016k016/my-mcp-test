// レート制限機能のテスト
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Redisモックを設定
vi.mock('@/lib/redis', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn(),
    zremrangebyscore: vi.fn(),
    zcard: vi.fn(),
    zrange: vi.fn(),
    zadd: vi.fn(),
  },
}))

import {
  rateLimit,
  resetRateLimit,
  rateLimitLogin,
  rateLimitPasswordReset,
  rateLimitInvitation,
} from '@/lib/rate-limit'
import { redis } from '@/lib/redis'

describe('Rate Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rateLimit', () => {
    it('Redis未設定時は常に成功する', async () => {
      // Redisをnullに設定
      vi.mocked(redis).incr = null as any

      const result = await rateLimit('test@example.com')

      expect(result.success).toBe(true)
      expect(result.current).toBe(1)
    })

    it('制限内のリクエストは成功する', async () => {
      vi.mocked(redis.incr).mockResolvedValue(5)
      vi.mocked(redis.ttl).mockResolvedValue(50)

      const result = await rateLimit('test@example.com', { limit: 10, window: 60 })

      expect(result.success).toBe(true)
      expect(result.current).toBe(5)
      expect(result.limit).toBe(10)
      expect(result.resetIn).toBe(50)
    })

    it('制限を超えたリクエストは失敗する', async () => {
      vi.mocked(redis.incr).mockResolvedValue(11)
      vi.mocked(redis.ttl).mockResolvedValue(45)

      const result = await rateLimit('test@example.com', { limit: 10, window: 60 })

      expect(result.success).toBe(false)
      expect(result.current).toBe(11)
      expect(result.limit).toBe(10)
      expect(result.error).toContain('制限を超えました')
      expect(result.resetIn).toBe(45)
    })

    it('最初のリクエスト時に有効期限を設定する', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1)
      vi.mocked(redis.ttl).mockResolvedValue(60)

      await rateLimit('test@example.com', { limit: 10, window: 60 })

      expect(redis.expire).toHaveBeenCalledWith('rate_limit:test@example.com', 60)
    })

    it('カスタムプレフィックスを使用できる', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1)
      vi.mocked(redis.ttl).mockResolvedValue(300)

      await rateLimit('test@example.com', { limit: 5, window: 300, prefix: 'custom' })

      expect(redis.incr).toHaveBeenCalledWith('custom:test@example.com')
    })
  })

  describe('resetRateLimit', () => {
    it('指定した識別子のレート制限をリセットできる', async () => {
      await resetRateLimit('test@example.com')

      expect(redis.del).toHaveBeenCalledWith('rate_limit:test@example.com')
    })

    it('カスタムプレフィックスでリセットできる', async () => {
      await resetRateLimit('test@example.com', 'custom')

      expect(redis.del).toHaveBeenCalledWith('custom:test@example.com')
    })
  })

  describe('rateLimitLogin', () => {
    it('ログイン試行のレート制限を適用する（5回/5分）', async () => {
      vi.mocked(redis.incr).mockResolvedValue(3)
      vi.mocked(redis.ttl).mockResolvedValue(200)

      const result = await rateLimitLogin('test@example.com')

      expect(result.success).toBe(true)
      expect(result.limit).toBe(5)
      expect(redis.incr).toHaveBeenCalledWith('rl:login:test@example.com')
    })

    it('ログイン試行が制限を超えると失敗する', async () => {
      vi.mocked(redis.incr).mockResolvedValue(6)
      vi.mocked(redis.ttl).mockResolvedValue(100)

      const result = await rateLimitLogin('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('制限を超えました')
    })
  })

  describe('rateLimitPasswordReset', () => {
    it('パスワードリセットのレート制限を適用する（3回/時間）', async () => {
      vi.mocked(redis.incr).mockResolvedValue(2)
      vi.mocked(redis.ttl).mockResolvedValue(3000)

      const result = await rateLimitPasswordReset('test@example.com')

      expect(result.success).toBe(true)
      expect(result.limit).toBe(3)
      expect(redis.incr).toHaveBeenCalledWith('rl:password_reset:test@example.com')
    })
  })

  describe('rateLimitInvitation', () => {
    it('メンバー招待のレート制限を適用する（10回/時間）', async () => {
      vi.mocked(redis.incr).mockResolvedValue(7)
      vi.mocked(redis.ttl).mockResolvedValue(2000)

      const result = await rateLimitInvitation('org-123')

      expect(result.success).toBe(true)
      expect(result.limit).toBe(10)
      expect(redis.incr).toHaveBeenCalledWith('rl:invitation:org-123')
    })
  })

  describe('エラーハンドリング', () => {
    it('Redis接続エラー時は成功を返す（フェイルオープン）', async () => {
      vi.mocked(redis.incr).mockRejectedValue(new Error('Redis connection failed'))

      const result = await rateLimit('test@example.com')

      expect(result.success).toBe(true)
      expect(result.current).toBe(1)
    })
  })
})
