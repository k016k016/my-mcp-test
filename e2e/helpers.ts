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
    password: 'OpsPassword123!',
    metadata: { is_ops: true },
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'admin',
  },
  owner: {
    email: 'owner@example.com',
    password: 'OwnerPassword123!',
    role: 'owner',
  },
  member: {
    email: 'member@example.com',
    password: 'MemberPassword123!',
    role: 'member',
  },
  'no-org': {
    email: 'noorg@example.com',
    password: 'NoOrgPassword123!',
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

  await page.goto(loginUrl)
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button[type="submit"]')

  // ログイン後のリダイレクトを待機
  await page.waitForURL(/local\.test:3000/, { timeout: 10000 })
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
