// Resendクライアント
import { Resend } from 'resend'

let resendClient: Resend | null = null

/**
 * Resendクライアントを取得
 */
export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error(
      'ResendのAPIキーが設定されていません。RESEND_API_KEYを設定してください。'
    )
  }

  resendClient = new Resend(apiKey)

  return resendClient
}

/**
 * デフォルトの送信元メールアドレスを取得
 */
export function getDefaultFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL

  if (!from) {
    throw new Error('RESEND_FROM_EMAILが設定されていません')
  }

  return from
}
