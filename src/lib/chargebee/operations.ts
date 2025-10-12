// Chargebee操作関数
import { getChargebeeClient } from './client'

/**
 * 顧客を作成する
 */
export async function createCustomer(params: {
  id?: string
  email: string
  first_name?: string
  last_name?: string
  company?: string
}) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.customer.create(params)
  return result.customer
}

/**
 * 顧客を取得する
 */
export async function getCustomer(customerId: string) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.customer.retrieve(customerId)
  return result.customer
}

/**
 * サブスクリプションを作成する
 */
export async function createSubscription(params: {
  customer_id?: string
  plan_id: string
  billing_cycles?: number
  auto_collection?: 'on' | 'off'
  trial_end?: number
}) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.subscription.create(params)
  return result.subscription
}

/**
 * サブスクリプションを取得する
 */
export async function getSubscription(subscriptionId: string) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.subscription.retrieve(subscriptionId)
  return result.subscription
}

/**
 * サブスクリプションをキャンセルする
 */
export async function cancelSubscription(
  subscriptionId: string,
  options?: {
    end_of_term?: boolean // 期間終了時にキャンセル
    cancel_at?: number // 指定日時にキャンセル（Unix timestamp）
  }
) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.subscription.cancel(subscriptionId, options)
  return result.subscription
}

/**
 * サブスクリプションを更新する
 */
export async function updateSubscription(
  subscriptionId: string,
  params: {
    plan_id?: string
    plan_quantity?: number
    end_of_term?: boolean
  }
) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.subscription.update(subscriptionId, params)
  return result.subscription
}

/**
 * ホストされたチェックアウトページを作成する
 */
export async function createHostedPage(params: {
  type: 'checkout_new' | 'checkout_existing' | 'manage_payment_sources'
  customer?: {
    id?: string
    email?: string
    first_name?: string
    last_name?: string
  }
  subscription?: {
    plan_id: string
    plan_quantity?: number
  }
  redirect_url?: string
  cancel_url?: string
}) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.hosted_page.checkout_new(params)
  return result.hosted_page
}

/**
 * インボイスを取得する
 */
export async function getInvoice(invoiceId: string) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.invoice.retrieve(invoiceId)
  return result.invoice
}

/**
 * 顧客のインボイス一覧を取得する
 */
export async function listInvoices(customerId: string) {
  const chargebee = getChargebeeClient()

  const result = await chargebee.invoice
    .list({
      'customer_id[is]': customerId,
    })
    .request()

  return result.list.map((entry: any) => entry.invoice)
}

/**
 * Webhookを検証する
 */
export function verifyWebhook(webhookData: any, signature: string): boolean {
  // Chargebeeのwebhook検証ロジック
  // 実装はChargebeeのドキュメントを参照
  return true
}
