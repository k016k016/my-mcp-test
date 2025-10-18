// E2Eテスト用ヘルパー関数
import { Page } from '@playwright/test'

/**
 * テストユーザーの種類
 */
export type UserType = 'ops' | 'admin' | 'owner' | 'member' | 'no-org'

/**
 * テスト用ユーザー情報
 */
export const TEST_USERS = {
  ops: {
    email: 'ops@example.com',
    password: 'test1234',
    metadata: { is_ops: true },
  },
  admin: {
    email: 'admin@example.com',
    password: 'test1234',
    role: 'admin',
  },
  owner: {
    email: 'owner@example.com',
    password: 'test1234',
    role: 'owner',
  },
  member: {
    email: 'member@example.com',
    password: 'test1234',
    role: 'member',
  },
  'no-org': {
    email: 'noorg@example.com',
    password: 'test1234',
  },
} as const

/**
 * ドメインURL（環境変数から取得、Vercel Previewでも動作）
 */
export const DOMAINS = {
  WWW: process.env.NEXT_PUBLIC_WWW_URL || 'http://www.local.test:3000',
  APP: process.env.NEXT_PUBLIC_APP_URL || 'http://app.local.test:3000',
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.local.test:3000',
  OPS: process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.local.test:3000',
} as const

/**
 * 指定したユーザーでログイン
 */
export async function loginAs(page: Page, userType: UserType) {
  const user = TEST_USERS[userType]

  // OPSユーザーはOPSドメインのログイン、それ以外はWWWドメイン
  const loginUrl = userType === 'ops'
    ? `${DOMAINS.OPS}/login`
    : `${DOMAINS.WWW}/login`

  await page.goto(loginUrl, { waitUntil: 'networkidle' })

  // フォームが表示されるまで待機
  await page.waitForSelector('input[name="email"]', { state: 'visible' })
  await page.waitForSelector('input[name="password"]', { state: 'visible' })

  // 入力フィールドに値を入力（pressSequentiallyでより確実に）
  await page.locator('input[name="email"]').fill(user.email)
  await page.locator('input[name="password"]').fill(user.password)

  // 入力値が確実に設定されたか確認
  await page.waitForFunction(
    ({ email, password }) => {
      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement
      return emailInput?.value === email && passwordInput?.value === password
    },
    { email: user.email, password: user.password },
    { timeout: 5000 }
  )

  // submitボタンを待機してからクリック（完全一致で"ログイン"のみを対象）
  const submitButton = page.getByRole('button', { name: 'ログイン', exact: true })
  await submitButton.waitFor({ state: 'visible' })

  // クリック前の現在URLを記録
  const beforeUrl = page.url()

  await submitButton.click()

  // ログイン後のリダイレクトを待機（WWWドメイン以外にリダイレクトされるまで待つ）
  // Firefox/Webkitはリダイレクトが遅いため、タイムアウトを長めに設定
  // また、URLが変わったことを確実に確認
  await page.waitForURL((url) => {
    const urlStr = url.toString()
    const isNotWWW = !urlStr.includes('www.local.test')
    const hasChanged = urlStr !== beforeUrl
    return isNotWWW && hasChanged
  }, { timeout: 30000 }) // より長いタイムアウト

  // ページが完全にロードされるまで待機
  await page.waitForLoadState('networkidle')

  // 追加の安定性確保：DOM が準備完了まで待機
  await page.waitForLoadState('domcontentloaded')
}

/**
 * OPS権限を持つユーザーとしてログイン
 */
export async function loginAsOps(page: Page) {
  return loginAs(page, 'ops')
}

/**
 * 管理者としてログイン
 */
export async function loginAsAdmin(page: Page) {
  return loginAs(page, 'admin')
}

/**
 * オーナーとしてログイン
 */
export async function loginAsOwner(page: Page) {
  return loginAs(page, 'owner')
}

/**
 * 一般メンバーとしてログイン
 */
export async function loginAsMember(page: Page) {
  return loginAs(page, 'member')
}

/**
 * 組織に所属していないユーザーとしてログイン
 */
export async function loginAsNoOrg(page: Page) {
  return loginAs(page, 'no-org')
}

/**
 * ログアウト
 */
export async function logout(page: Page) {
  // ユーザーメニューを開く
  await page.click('[data-testid="user-menu"]')
  // ログアウトボタンをクリック
  await page.click('text=ログアウト')
  // WWWドメインにリダイレクトされることを確認
  await page.waitForURL(/^http:\/\/www\.local\.test:3000/)
}

/**
 * 一意なメールアドレスを生成
 */
export function generateUniqueEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  return `${prefix}-${timestamp}@example.com`
}

/**
 * テスト用の組織を作成
 */
export async function createTestOrganization(
  page: Page,
  name: string = 'Test Organization'
) {
  await page.goto(`${DOMAINS.APP}/onboarding/create-organization`)
  await page.fill('input[name="name"]', name)
  await page.fill('input[name="slug"]', name.toLowerCase().replace(/\s+/g, '-'))
  await page.click('button[type="submit"]')
  await page.waitForURL(`${DOMAINS.APP}/`)
}

/**
 * ページが特定のドメインにあることを確認
 */
export async function expectDomain(page: Page, domain: keyof typeof DOMAINS) {
  const expectedUrl = DOMAINS[domain]
  const currentUrl = page.url()

  if (!currentUrl.startsWith(expectedUrl)) {
    throw new Error(
      `Expected domain ${domain} (${expectedUrl}), but got ${currentUrl}`
    )
  }
}

/**
 * エラーメッセージが表示されることを確認
 */
export async function expectErrorMessage(page: Page, message: string) {
  const errorLocator = page.locator(`text=${message}`)
  await errorLocator.waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * 成功メッセージが表示されることを確認
 */
export async function expectSuccessMessage(page: Page, message: string) {
  const successLocator = page.locator(`text=${message}`)
  await successLocator.waitFor({ state: 'visible', timeout: 5000 })
}
