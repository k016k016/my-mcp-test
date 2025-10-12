// マルチドメインのE2Eテスト
import { test, expect } from '@playwright/test'

test.describe('マルチドメイン', () => {
  test('WWWドメインにアクセスできる', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // マーケティングページが表示される
    await expect(page.locator('text=ログイン')).toBeVisible()
    await expect(page.locator('text=サインアップ')).toBeVisible()
  })

  test('APPドメインは認証が必要', async ({ page }) => {
    await page.goto('http://app.localhost:3000')

    // 認証されていない場合はログインページにリダイレクト
    await expect(page).toHaveURL(/localhost:3000\/login/)
  })

  test('ADMINドメインは認証が必要', async ({ page }) => {
    await page.goto('http://admin.localhost:3000')

    // 認証されていない場合はログインページにリダイレクト
    await expect(page).toHaveURL(/localhost:3000\/login/)
  })

  test('OPSドメインは認証が必要', async ({ page }) => {
    await page.goto('http://ops.localhost:3000')

    // 認証されていない場合はログインページにリダイレクト
    await expect(page).toHaveURL(/localhost:3000\/login/)
  })

  test('未知のサブドメインは404を返す', async ({ page }) => {
    // 存在しないサブドメインにアクセス
    const response = await page.goto('http://unknown.localhost:3000')

    // 404ステータスコードを確認
    expect(response?.status()).toBe(404)
  })

  test('ADMINドメインで組織一覧が表示される', async ({ page }) => {
    // 管理者としてログイン（テスト用のヘルパー関数を使用）
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // ADMINドメインの組織ページに移動
    await page.goto('http://admin.localhost:3000/organizations')

    // 組織一覧が表示されることを確認
    await expect(page.locator('h1:has-text("組織管理")')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('OPSドメインでシステムステータスが表示される', async ({ page }) => {
    // 運用チームとしてログイン
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'ops@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // OPSドメインに移動
    await page.goto('http://ops.localhost:3000')

    // システムステータスが表示されることを確認
    await expect(page.locator('h1:has-text("運用ダッシュボード")')).toBeVisible()
    await expect(page.locator('text=システムステータス')).toBeVisible()
  })
})
