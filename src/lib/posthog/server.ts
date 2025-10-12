// PostHogクライアント（サーバー側用）
import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

/**
 * サーバーサイド用PostHogクライアントを取得
 */
export function getPostHogClient(): PostHog {
  if (posthogClient) {
    return posthogClient
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

  if (!apiKey) {
    throw new Error('PostHogのAPIキーが設定されていません')
  }

  posthogClient = new PostHog(apiKey, {
    host: apiHost,
  })

  return posthogClient
}

/**
 * PostHogクライアントをシャットダウン
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}
