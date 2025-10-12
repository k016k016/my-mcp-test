// Chargebeeクライアント
import { ChargeBee } from 'chargebee-typescript'

let chargebeeClient: ChargeBee | null = null

/**
 * Chargebeeクライアントを取得
 */
export function getChargebeeClient(): ChargeBee {
  if (chargebeeClient) {
    return chargebeeClient
  }

  const site = process.env.CHARGEBEE_SITE
  const apiKey = process.env.CHARGEBEE_API_KEY

  if (!site || !apiKey) {
    throw new Error(
      'Chargebeeの環境変数が設定されていません。CHARGEBEE_SITEとCHARGEBEE_API_KEYを設定してください。'
    )
  }

  chargebeeClient = new ChargeBee()
  chargebeeClient.configure({
    site,
    api_key: apiKey,
  })

  return chargebeeClient
}

/**
 * Chargebeeのサイト名を取得
 */
export function getChargebeeSite(): string {
  const site = process.env.CHARGEBEE_SITE

  if (!site) {
    throw new Error('CHARGEBEE_SITEが設定されていません')
  }

  return site
}

/**
 * Chargebee公開可能キーを取得（フロントエンド用）
 */
export function getChargebeePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY

  if (!key) {
    throw new Error('NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEYが設定されていません')
  }

  return key
}
