// Redis操作を行う関数群
import { getRedisClient } from './client'

/**
 * キーと値のペア型
 */
export type RedisValue = string | number | boolean | object | null

/**
 * 値を設定する
 * @param key キー
 * @param value 値（自動的にJSON文字列化されます）
 * @param options オプション
 */
export async function set(
  key: string,
  value: RedisValue,
  options?: {
    ex?: number // 有効期限（秒）
    px?: number // 有効期限（ミリ秒）
    exat?: number // Unix時刻（秒）での有効期限
    pxat?: number // Unix時刻（ミリ秒）での有効期限
    nx?: boolean // キーが存在しない場合のみ設定
    xx?: boolean // キーが存在する場合のみ設定
  }
): Promise<void> {
  const redis = getRedisClient()
  await redis.set(key, value, options)
}

/**
 * 値を取得する
 * @param key キー
 * @returns 値（自動的にパースされます）、存在しない場合はnull
 */
export async function get<T = RedisValue>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  return await redis.get<T>(key)
}

/**
 * 値を取得して削除する
 * @param key キー
 * @returns 削除された値、存在しない場合はnull
 */
export async function getdel<T = RedisValue>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  return await redis.getdel<T>(key)
}

/**
 * キーを削除する
 * @param keys 削除するキー（複数指定可能）
 * @returns 削除されたキーの数
 */
export async function del(...keys: string[]): Promise<number> {
  const redis = getRedisClient()
  return await redis.del(...keys)
}

/**
 * キーが存在するか確認する
 * @param key キー
 * @returns 存在する場合はtrue
 */
export async function exists(key: string): Promise<boolean> {
  const redis = getRedisClient()
  const result = await redis.exists(key)
  return result === 1
}

/**
 * キーの有効期限を設定する
 * @param key キー
 * @param seconds 有効期限（秒）
 * @returns 成功した場合はtrue
 */
export async function expire(key: string, seconds: number): Promise<boolean> {
  const redis = getRedisClient()
  const result = await redis.expire(key, seconds)
  return result === 1
}

/**
 * キーの残り有効期限を取得する
 * @param key キー
 * @returns 残り秒数、キーが存在しない場合は-2、有効期限がない場合は-1
 */
export async function ttl(key: string): Promise<number> {
  const redis = getRedisClient()
  return await redis.ttl(key)
}

/**
 * 数値をインクリメントする
 * @param key キー
 * @param amount インクリメント量（デフォルトは1）
 * @returns インクリメント後の値
 */
export async function incr(key: string, amount: number = 1): Promise<number> {
  const redis = getRedisClient()
  if (amount === 1) {
    return await redis.incr(key)
  }
  return await redis.incrby(key, amount)
}

/**
 * 数値をデクリメントする
 * @param key キー
 * @param amount デクリメント量（デフォルトは1）
 * @returns デクリメント後の値
 */
export async function decr(key: string, amount: number = 1): Promise<number> {
  const redis = getRedisClient()
  if (amount === 1) {
    return await redis.decr(key)
  }
  return await redis.decrby(key, amount)
}

/**
 * ハッシュに値を設定する
 * @param key ハッシュのキー
 * @param field フィールド名
 * @param value 値
 */
export async function hset(
  key: string,
  field: string,
  value: RedisValue
): Promise<void> {
  const redis = getRedisClient()
  await redis.hset(key, { [field]: value })
}

/**
 * ハッシュから値を取得する
 * @param key ハッシュのキー
 * @param field フィールド名
 * @returns 値、存在しない場合はnull
 */
export async function hget<T = RedisValue>(
  key: string,
  field: string
): Promise<T | null> {
  const redis = getRedisClient()
  return await redis.hget<T>(key, field)
}

/**
 * ハッシュの全フィールドと値を取得する
 * @param key ハッシュのキー
 * @returns フィールドと値のマップ
 */
export async function hgetall<T = Record<string, RedisValue>>(
  key: string
): Promise<T> {
  const redis = getRedisClient()
  return await redis.hgetall<T>(key)
}

/**
 * ハッシュのフィールドを削除する
 * @param key ハッシュのキー
 * @param fields 削除するフィールド（複数指定可能）
 * @returns 削除されたフィールドの数
 */
export async function hdel(key: string, ...fields: string[]): Promise<number> {
  const redis = getRedisClient()
  return await redis.hdel(key, ...fields)
}

/**
 * リストの末尾に要素を追加する
 * @param key リストのキー
 * @param values 追加する値（複数指定可能）
 * @returns リストの長さ
 */
export async function rpush(
  key: string,
  ...values: RedisValue[]
): Promise<number> {
  const redis = getRedisClient()
  return await redis.rpush(key, ...values)
}

/**
 * リストの先頭に要素を追加する
 * @param key リストのキー
 * @param values 追加する値（複数指定可能）
 * @returns リストの長さ
 */
export async function lpush(
  key: string,
  ...values: RedisValue[]
): Promise<number> {
  const redis = getRedisClient()
  return await redis.lpush(key, ...values)
}

/**
 * リストの末尾から要素を取り出す
 * @param key リストのキー
 * @returns 取り出した値、リストが空の場合はnull
 */
export async function rpop<T = RedisValue>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  return await redis.rpop<T>(key)
}

/**
 * リストの先頭から要素を取り出す
 * @param key リストのキー
 * @returns 取り出した値、リストが空の場合はnull
 */
export async function lpop<T = RedisValue>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  return await redis.lpop<T>(key)
}

/**
 * リストの範囲を取得する
 * @param key リストのキー
 * @param start 開始インデックス
 * @param stop 終了インデックス
 * @returns 要素の配列
 */
export async function lrange<T = RedisValue>(
  key: string,
  start: number,
  stop: number
): Promise<T[]> {
  const redis = getRedisClient()
  return await redis.lrange<T>(key, start, stop)
}

/**
 * セットに要素を追加する
 * @param key セットのキー
 * @param members 追加する要素（複数指定可能）
 * @returns 追加された要素の数
 */
export async function sadd(
  key: string,
  ...members: RedisValue[]
): Promise<number> {
  const redis = getRedisClient()
  return await redis.sadd(key, ...members)
}

/**
 * セットから要素を削除する
 * @param key セットのキー
 * @param members 削除する要素（複数指定可能）
 * @returns 削除された要素の数
 */
export async function srem(
  key: string,
  ...members: RedisValue[]
): Promise<number> {
  const redis = getRedisClient()
  return await redis.srem(key, ...members)
}

/**
 * セットの全要素を取得する
 * @param key セットのキー
 * @returns 要素の配列
 */
export async function smembers<T = RedisValue>(key: string): Promise<T[]> {
  const redis = getRedisClient()
  return await redis.smembers<T>(key)
}

/**
 * セットに要素が含まれるか確認する
 * @param key セットのキー
 * @param member 確認する要素
 * @returns 含まれる場合はtrue
 */
export async function sismember(
  key: string,
  member: RedisValue
): Promise<boolean> {
  const redis = getRedisClient()
  const result = await redis.sismember(key, member)
  return result === 1
}

/**
 * ソート済みセットに要素を追加する
 * @param key ソート済みセットのキー
 * @param score スコア
 * @param member 要素
 * @returns 追加された要素の数
 */
export async function zadd(
  key: string,
  score: number,
  member: RedisValue
): Promise<number> {
  const redis = getRedisClient()
  return await redis.zadd(key, { score, member })
}

/**
 * ソート済みセットの範囲を取得する（スコア順）
 * @param key ソート済みセットのキー
 * @param start 開始インデックス
 * @param stop 終了インデックス
 * @returns 要素の配列
 */
export async function zrange<T = RedisValue>(
  key: string,
  start: number,
  stop: number
): Promise<T[]> {
  const redis = getRedisClient()
  return await redis.zrange<T>(key, start, stop)
}

/**
 * ソート済みセットから要素を削除する
 * @param key ソート済みセットのキー
 * @param members 削除する要素（複数指定可能）
 * @returns 削除された要素の数
 */
export async function zrem(
  key: string,
  ...members: RedisValue[]
): Promise<number> {
  const redis = getRedisClient()
  return await redis.zrem(key, ...members)
}

/**
 * パターンに一致するキーを取得する
 * @param pattern パターン（例: "user:*"）
 * @returns マッチしたキーの配列
 */
export async function keys(pattern: string): Promise<string[]> {
  const redis = getRedisClient()
  return await redis.keys(pattern)
}

/**
 * データベース内の全キーを削除する
 * ⚠️ 注意: 本番環境では使用しないでください
 */
export async function flushdb(): Promise<void> {
  const redis = getRedisClient()
  await redis.flushdb()
}
