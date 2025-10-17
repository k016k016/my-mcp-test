// 認証E2Eテスト - 実装済み機能のみ
import { test, expect } from '@playwright/test'

const DOMAINS = {
  WWW: 'http://www.local.test:3000',
  APP: 'http://app.local.test:3000',
  ADMIN: 'http://admin.local.test:3000',
}

// テスト用の共通パスワード
const TEST_PASSWORD = 'test1234'

test.describe('認証フロー', () => {
  // 1. サインアップ完全フロー
  test('サインアップ → プラン選択 → 支払いページへ', async ({ page }) => {
    await page.goto(`${DOMAINS.WWW}/signup`)

    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    const companyName = `Test Company ${timestamp}`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.fill('input[name="confirmPassword"]', 'TestPass123!')
    await page.fill('input[name="companyName"]', companyName)
    await page.fill('input[name="contactName"]', 'Test User')

    await page.click('button[type="submit"]:has-text("無料でアカウントを作成")')

    // ✅ プラン選択ページに到達
    await expect(page).toHaveURL(/\/onboarding\/select-plan/, { timeout: 10000 })

    // ✅ プラン選択UIが表示される
    await expect(page.locator('text=プランを選択してください').first()).toBeVisible()

    // Freeプランを選択（最初のプラン）
    const freePlanButton = page.locator('button:has-text("このプランを選択")').first()
    await freePlanButton.click()

    // 支払いページに遷移する
    await expect(page).toHaveURL(/\/onboarding\/payment/, { timeout: 10000 })
  })

  // 2. ログイン成功（Owner → ADMIN）
  test('owner権限ユーザー → ADMINドメインにリダイレクト', async ({ page }) => {
    // 前提: owner@example.com が存在すること
    await page.goto(`${DOMAINS.WWW}/login`)

    await page.fill('input[name="email"]', 'owner@example.com')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]:has-text("ログイン")')

    // ✅ ADMINドメインにリダイレクト
    await expect(page).toHaveURL(/admin\.local\.test/, { timeout: 10000 })
  })

  // 3. ログイン成功（Member → APP）
  test('member権限ユーザー → APPドメインにリダイレクト', async ({ page }) => {
    // 前提: member@example.com が存在すること
    await page.goto(`${DOMAINS.WWW}/login`)

    await page.fill('input[name="email"]', 'member@example.com')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]:has-text("ログイン")')

    // ✅ APPドメインにリダイレクト
    await expect(page).toHaveURL(/app\.local\.test/, { timeout: 10000 })
  })

  // 4. ログイン失敗
  test('間違った認証情報 → エラー表示', async ({ page }) => {
    await page.goto(`${DOMAINS.WWW}/login`)

    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]:has-text("ログイン")')

    // ✅ エラーメッセージが表示
    await expect(page.locator('text=メールアドレスまたはパスワードが正しくありません')).toBeVisible({
      timeout: 5000,
    })
  })

  // 5. ログアウト
  test('ログアウト → WWWドメインにリダイレクト', async ({ page }) => {
    // ログイン
    await page.goto(`${DOMAINS.WWW}/login`)
    await page.fill('input[name="email"]', 'owner@example.com')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]:has-text("ログイン")')
    await page.waitForURL(/admin\.local\.test/, { timeout: 10000 })

    // ログアウト
    await page.click('button:has-text("ログアウト")')

    // ✅ WWWドメインにリダイレクト
    await expect(page).toHaveURL(/^http:\/\/www\.local\.test:3000/, { timeout: 5000 })
  })
})
