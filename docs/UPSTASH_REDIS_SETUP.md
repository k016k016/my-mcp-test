# Upstash Redis セットアップガイド

このガイドでは、Upstash Redis（サーバーレス対応のRedisサービス）をNext.jsアプリケーションで使用するための設定手順を説明します。

## Upstash Redisとは

Upstash Redisは、HTTP REST API経由でアクセスできるサーバーレス対応のRedisサービスです。
従来のRedisと異なり、コネクションプールを管理する必要がなく、サーバーレス環境（Vercel、AWS Lambda等）で簡単に使用できます。

### 主な特徴

- **サーバーレス対応**: HTTP経由でアクセスするため、コネクション管理不要
- **従量課金**: リクエストごとの課金で、使わなければコストがかからない
- **低レイテンシ**: グローバルに分散したエッジロケーション
- **Redis互換**: 標準的なRedisコマンドをサポート

## 前提条件

- Upstashアカウント（[https://console.upstash.com](https://console.upstash.com)で作成）

## 1. Redisデータベースの作成

1. [Upstashコンソール](https://console.upstash.com)にログイン
2. 「Redis」タブを選択
3. 「Create Database」をクリック
4. データベースの設定:
   - **Name**: データベース名を入力（例: `my-app-redis`）
   - **Type**:
     - **Regional**: 単一リージョン（低コスト）
     - **Global**: グローバル分散（低レイテンシ）
   - **Region**: 最も近いリージョンを選択（例: Tokyo）
   - **TLS**: 有効化（推奨）
5. 「Create」をクリック

## 2. 接続情報の取得

1. 作成したデータベースをクリック
2. 「REST API」タブを選択
3. 以下の情報をコピー:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

## 3. 環境変数の設定

`.env.local`ファイルに以下の値を設定します:

\`\`\`bash
# Upstash Redis設定
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
\`\`\`

## 4. プロジェクト構成

以下のファイルが作成されています:

- **src/lib/redis/client.ts**: Redisクライアントの初期化
- **src/lib/redis/operations.ts**: Redis操作関数群
- **src/lib/redis/index.ts**: エクスポート用エントリーポイント

## 5. 使用方法

### 5.1 基本的なキーバリュー操作

\`\`\`typescript
import { set, get, del } from '@/lib/redis'

// 値を設定
await set('user:123', { name: '太郎', age: 25 })

// 値を取得
const user = await get<{ name: string; age: number }>('user:123')
console.log(user) // { name: '太郎', age: 25 }

// 値を削除
await del('user:123')
\`\`\`

### 5.2 有効期限付きのデータ保存

\`\`\`typescript
import { set, ttl } from '@/lib/redis'

// 10秒後に自動削除
await set('session:abc123', { userId: '123' }, { ex: 10 })

// 残り有効期限を確認
const remaining = await ttl('session:abc123')
console.log(\`残り\${remaining}秒\`)
\`\`\`

### 5.3 カウンター

\`\`\`typescript
import { incr, decr, get } from '@/lib/redis'

// カウンターをインクリメント
await incr('page:views') // 1
await incr('page:views') // 2
await incr('page:views', 5) // 7（5ずつ増やす）

// カウンターをデクリメント
await decr('page:views') // 6

// 現在の値を取得
const views = await get<number>('page:views')
console.log(\`閲覧数: \${views}\`)
\`\`\`

### 5.4 ハッシュ（オブジェクトのフィールドごとに管理）

\`\`\`typescript
import { hset, hget, hgetall, hdel } from '@/lib/redis'

// フィールドを設定
await hset('user:123', 'name', '太郎')
await hset('user:123', 'age', 25)

// フィールドを取得
const name = await hget<string>('user:123', 'name')
console.log(name) // '太郎'

// 全フィールドを取得
const user = await hgetall<{ name: string; age: number }>('user:123')
console.log(user) // { name: '太郎', age: 25 }

// フィールドを削除
await hdel('user:123', 'age')
\`\`\`

### 5.5 リスト（キュー、スタック）

\`\`\`typescript
import { rpush, lpush, rpop, lpop, lrange } from '@/lib/redis'

// 末尾に追加（キューとして使用）
await rpush('queue:jobs', 'job1', 'job2', 'job3')

// 先頭から取り出す
const job = await lpop<string>('queue:jobs')
console.log(job) // 'job1'

// 全要素を取得
const allJobs = await lrange<string>('queue:jobs', 0, -1)
console.log(allJobs) // ['job2', 'job3']

// 先頭に追加（スタックとして使用）
await lpush('stack:history', 'action1', 'action2')

// 先頭から取り出す
const lastAction = await lpop<string>('stack:history')
console.log(lastAction) // 'action2'
\`\`\`

### 5.6 セット（重複なしコレクション）

\`\`\`typescript
import { sadd, srem, smembers, sismember } from '@/lib/redis'

// 要素を追加
await sadd('tags:article:1', 'javascript', 'typescript', 'nextjs')

// 要素が含まれるか確認
const hasJS = await sismember('tags:article:1', 'javascript')
console.log(hasJS) // true

// 全要素を取得
const tags = await smembers<string>('tags:article:1')
console.log(tags) // ['javascript', 'typescript', 'nextjs']

// 要素を削除
await srem('tags:article:1', 'javascript')
\`\`\`

### 5.7 ソート済みセット（ランキング）

\`\`\`typescript
import { zadd, zrange, zrem } from '@/lib/redis'

// スコア付きで要素を追加
await zadd('leaderboard', 100, 'player1')
await zadd('leaderboard', 250, 'player2')
await zadd('leaderboard', 150, 'player3')

// スコア順に取得（昇順）
const ranking = await zrange<string>('leaderboard', 0, -1)
console.log(ranking) // ['player1', 'player3', 'player2']

// 要素を削除
await zrem('leaderboard', 'player1')
\`\`\`

## 6. 実用例

### 6.1 セッション管理

\`\`\`typescript
import { set, get, del } from '@/lib/redis'

// セッションを作成（1時間で期限切れ）
export async function createSession(sessionId: string, userId: string) {
  await set(
    \`session:\${sessionId}\`,
    { userId, createdAt: Date.now() },
    { ex: 3600 } // 1時間
  )
}

// セッションを取得
export async function getSession(sessionId: string) {
  return await get<{ userId: string; createdAt: number }>(
    \`session:\${sessionId}\`
  )
}

// セッションを削除
export async function deleteSession(sessionId: string) {
  await del(\`session:\${sessionId}\`)
}
\`\`\`

### 6.2 レート制限

\`\`\`typescript
import { incr, expire, ttl } from '@/lib/redis'

// レート制限をチェック（1分間に10リクエストまで）
export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = \`ratelimit:\${userId}\`
  const count = await incr(key)

  // 最初のリクエストの場合、有効期限を設定
  if (count === 1) {
    await expire(key, 60) // 60秒
  }

  // 10リクエストを超えた場合は拒否
  return count <= 10
}

// 使用例
const canProceed = await checkRateLimit('user123')
if (!canProceed) {
  throw new Error('リクエストが多すぎます。しばらく待ってから再試行してください。')
}
\`\`\`

### 6.3 キャッシュ

\`\`\`typescript
import { set, get } from '@/lib/redis'

// データを取得（キャッシュあり）
export async function getArticle(id: string) {
  const cacheKey = \`article:\${id}\`

  // キャッシュを確認
  const cached = await get<Article>(cacheKey)
  if (cached) {
    return cached
  }

  // データベースから取得
  const article = await fetchArticleFromDB(id)

  // キャッシュに保存（5分間）
  await set(cacheKey, article, { ex: 300 })

  return article
}

type Article = {
  id: string
  title: string
  content: string
}

async function fetchArticleFromDB(id: string): Promise<Article> {
  // データベースからの取得処理
  return { id, title: 'サンプル記事', content: '...' }
}
\`\`\`

### 6.4 リアルタイムカウンター

\`\`\`typescript
import { incr, get } from '@/lib/redis'

// ページビューをカウント
export async function trackPageView(pageId: string) {
  await incr(\`pageviews:\${pageId}\`)
}

// ページビュー数を取得
export async function getPageViews(pageId: string): Promise<number> {
  const views = await get<number>(\`pageviews:\${pageId}\`)
  return views ?? 0
}
\`\`\`

## 7. Route Handlerの例

\`\`\`typescript
// src/app/api/cache/route.ts
import { get, set } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'キーが必要です' }, { status: 400 })
  }

  const value = await get(key)

  return NextResponse.json({ key, value })
}

export async function POST(request: NextRequest) {
  const { key, value, ttl } = await request.json()

  if (!key || value === undefined) {
    return NextResponse.json(
      { error: 'キーと値が必要です' },
      { status: 400 }
    )
  }

  await set(key, value, ttl ? { ex: ttl } : undefined)

  return NextResponse.json({ success: true, key, value })
}
\`\`\`

## 8. 料金について

Upstash Redisの料金体系:

### 無料プラン
- **リクエスト**: 10,000コマンド/日
- **ストレージ**: 256 MB
- **帯域幅**: 200 MB/日
- **同時接続**: 100

### 従量課金
- **リクエスト**: $0.2 / 100,000コマンド
- **ストレージ**: $0.25 / GB / 月
- **帯域幅**: $0.03 / GB

小規模なアプリケーションであれば、無料プランで十分です。

## 9. ベストプラクティス

### 9.1 キーの命名規則

\`\`\`typescript
// コロンで階層を区切る
'user:123:profile'
'session:abc123'
'cache:article:456'
'ratelimit:user:789'
\`\`\`

### 9.2 有効期限の設定

長期間使用しないデータには必ず有効期限を設定しましょう:

\`\`\`typescript
// キャッシュ: 短め（1-10分）
await set('cache:data', data, { ex: 300 })

// セッション: 中程度（1-24時間）
await set('session:id', session, { ex: 3600 })

// 一時データ: 短め（数秒-数分）
await set('temp:token', token, { ex: 60 })
\`\`\`

### 9.3 エラーハンドリング

\`\`\`typescript
import { get } from '@/lib/redis'

async function getCachedData(key: string) {
  try {
    return await get(key)
  } catch (error) {
    console.error('Redis error:', error)
    // キャッシュが使えない場合はDBから取得
    return await fetchFromDB(key)
  }
}
\`\`\`

## 10. トラブルシューティング

### 環境変数が読み込まれない

- 開発サーバーを再起動してください
- \`.env.local\`ファイルが正しい場所にあることを確認

### 接続エラー

- UpstashコンソールでURLとトークンが正しいか確認
- TLS設定を確認
- ネットワーク接続を確認

### パフォーマンスの問題

- キーの数を確認（数百万以上の場合はパーティショニングを検討）
- 大きな値を保存していないか確認（1MB以下推奨）
- 適切な有効期限を設定しているか確認

## 11. 従来のRedisとの違い

| 項目 | Upstash Redis | 従来のRedis |
|------|---------------|-------------|
| **接続方式** | HTTP REST API | TCP接続 |
| **コネクション管理** | 不要 | 必要 |
| **サーバーレス対応** | ◎ | △（複雑） |
| **レイテンシ** | やや高い（HTTP） | 低い（TCP） |
| **料金** | 従量課金 | 固定（インスタンス） |

## 参考リンク

- [Upstash Redis公式ドキュメント](https://docs.upstash.com/redis)
- [Upstash Redis SDK](https://github.com/upstash/upstash-redis)
- [Redis コマンドリファレンス](https://redis.io/commands/)
