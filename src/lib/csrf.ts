// CSRF保護機能
// Next.js Server Actionsは自動的にCSRF保護を提供しますが、
// 追加のトークン検証を実装することでセキュリティを強化します
'use server'

import { headers } from 'next/headers'

/**
 * CSRFトークンを検証
 *
 * Next.js Server Actionsは以下のCSRF保護を自動的に提供します:
 * 1. Same-Originポリシー
 * 2. Origin/Refererヘッダーのチェック
 * 3. POSTリクエストのみ許可
 *
 * この関数は追加の検証を行います
 */
export async function validateCsrfHeaders(): Promise<{ valid: boolean; error?: string }> {
  try {
    const headersList = await headers()

    // Originヘッダーを取得
    const origin = headersList.get('origin')
    const referer = headersList.get('referer')
    const host = headersList.get('host')

    // 開発環境では検証をスキップ
    if (process.env.NODE_ENV === 'development') {
      return { valid: true }
    }

    // OriginまたはRefererが存在しない場合（通常のブラウザリクエストでは必ず存在）
    if (!origin && !referer) {
      return {
        valid: false,
        error: 'OriginまたはRefererヘッダーが必要です'
      }
    }

    // Originが存在する場合、ホストと一致するかチェック
    if (origin) {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        return {
          valid: false,
          error: 'Originヘッダーが一致しません'
        }
      }
    }

    // Refererが存在する場合、ホストと一致するかチェック
    if (referer) {
      const refererHost = new URL(referer).host
      if (refererHost !== host) {
        return {
          valid: false,
          error: 'Refererヘッダーが一致しません'
        }
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('[validateCsrfHeaders] Error:', error)
    return {
      valid: false,
      error: 'CSRF検証中にエラーが発生しました'
    }
  }
}

/**
 * Server Actionでの推奨使用方法
 *
 * @example
 * ```ts
 * export async function myServerAction() {
 *   // CSRF検証（オプション - Next.jsが自動で保護）
 *   const csrf = await validateCsrfHeaders()
 *   if (!csrf.valid) {
 *     return { error: csrf.error }
 *   }
 *
 *   // アクション処理...
 * }
 * ```
 */

/**
 * セキュリティヘッダーの情報を取得（デバッグ用）
 */
export async function getCsrfHeaders() {
  const headersList = await headers()

  return {
    origin: headersList.get('origin'),
    referer: headersList.get('referer'),
    host: headersList.get('host'),
    'x-forwarded-host': headersList.get('x-forwarded-host'),
    'x-forwarded-proto': headersList.get('x-forwarded-proto'),
  }
}

/**
 * CSRF保護の説明
 *
 * Next.js 13+のServer Actionsは以下の方法でCSRF攻撃を防ぎます:
 *
 * 1. **Same-Originポリシー**:
 *    Server ActionsはPOSTリクエストでのみ呼び出し可能
 *
 * 2. **Originヘッダーチェック**:
 *    ブラウザが送信するOriginヘッダーをサーバーが検証
 *
 * 3. **Actionの明示的な'use server'ディレクティブ**:
 *    サーバー側でのみ実行されることを保証
 *
 * 4. **セッションベースの認証**:
 *    各リクエストにSupabaseセッションが必要
 *
 * この実装により、外部サイトからのServer Action呼び出しは
 * 自動的にブロックされます。
 */
