// ドメイン別認証テスト - AUTH_FLOW_SPECIFICATION.md準拠
import { test, expect } from '@playwright/test'
import {
  DOMAINS,
  loginAsOps,
  loginAsAdmin,
  loginAsOwner,
  loginAsMember,
} from './helpers'

test.describe('ドメイン別認証 - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('WWWドメイン', () => {
    test('認証なしで自由にアクセスできる', async ({ page }) => {
      await page.goto(DOMAINS.WWW)

      // トップページが表示される
      await expect(page.locator('a[href="/login"]:has-text("ログイン")').first()).toBeVisible()
      await expect(page.locator('a[href="/signup"]:has-text("サインアップ")').first()).toBeVisible()
    })

    test('ログインページにアクセスできる', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/login`)

      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
    })

    test('サインアップページにアクセスできる', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/signup`)

      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('input[name="companyName"]')).toBeVisible()
    })
  })

  test.describe('APPドメイン', () => {
    test('未認証の場合、WWW/loginにリダイレクトされる', async ({ page }) => {
      await page.goto(DOMAINS.APP)

      // WWWドメインのログインページにリダイレクト
      await expect(page).toHaveURL(/localhost:3000\/login/, { timeout: 5000 })
    })

    test('認証済みの一般ユーザーはアクセスできる', async ({ page }) => {
      await loginAsMember(page)

      await page.goto(DOMAINS.APP)

      // APPドメインのダッシュボードが表示される
      await expect(page).toHaveURL(/app\.localhost:3000/)
    })

    test('認証済みの管理者もアクセスできる', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto(DOMAINS.APP)

      // APPドメインにアクセスできる
      await expect(page).toHaveURL(/app\.localhost:3000/)
    })

    test('認証済みのオーナーもアクセスできる', async ({ page }) => {
      await loginAsOwner(page)

      await page.goto(DOMAINS.APP)

      // APPドメインにアクセスできる
      await expect(page).toHaveURL(/app\.localhost:3000/)
    })
  })

  test.describe('ADMINドメイン', () => {
    test('未認証の場合、WWW/loginにリダイレクトされる', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // WWWドメインのログインページにリダイレクト
      await expect(page).toHaveURL(/localhost:3000\/login/, { timeout: 5000 })
    })

    test('管理者権限がない場合、APPドメインにリダイレクトされる', async ({
      page,
    }) => {
      await loginAsMember(page)

      await page.goto(DOMAINS.ADMIN, { waitUntil: 'domcontentloaded' })

      // APPドメインにリダイレクト + エラーメッセージ
      await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })
      await expect(
        page.locator('text=管理者権限がありません')
      ).toBeVisible()
    })

    test('管理者権限(admin)がある場合、アクセスできる', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto(DOMAINS.ADMIN)

      // ADMINドメインにアクセスできる
      await expect(page).toHaveURL(/admin\.localhost:3000/)
    })

    test('管理者権限(owner)がある場合、アクセスできる', async ({ page }) => {
      await loginAsOwner(page)

      await page.goto(DOMAINS.ADMIN)

      // ADMINドメインにアクセスできる
      await expect(page).toHaveURL(/admin\.localhost:3000/)
    })
  })

  test.describe('OPSドメイン', () => {
    test('未認証の場合、OPS/loginにリダイレクトされる', async ({ page }) => {
      await page.goto(DOMAINS.OPS)

      // OPSドメインの独自ログインページにリダイレクト
      await expect(page).toHaveURL(/ops\.localhost:3000\/login/, {
        timeout: 5000,
      })
    })

    test('OPS権限がない一般ユーザーはWWW/loginにリダイレクトされる', async ({
      page,
    }) => {
      await loginAsMember(page)

      await page.goto(DOMAINS.OPS)

      // WWWログインページにリダイレクト
      await expect(page).toHaveURL(/localhost:3000\/login/, { timeout: 5000 })
    })

    test('OPS権限がない管理者もWWW/loginにリダイレクトされる', async ({
      page,
    }) => {
      await loginAsAdmin(page)

      await page.goto(DOMAINS.OPS)

      // WWWログインページにリダイレクト
      await expect(page).toHaveURL(/localhost:3000\/login/, { timeout: 5000 })
    })

    test('OPS権限がある場合、アクセスできる', async ({ page }) => {
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // OPSドメインのダッシュボードにアクセスできる
      await expect(page).toHaveURL(/ops\.localhost:3000/)
      await expect(page.locator('text=運用ダッシュボード')).toBeVisible()
    })
  })

  test.describe('未知のサブドメイン', () => {
    test('存在しないサブドメインは404を返す', async ({ page }) => {
      const response = await page.goto('http://unknown.localhost:3000')

      // 404ステータスコードを確認
      expect(response?.status()).toBe(404)

      // 404エラーメッセージを確認
      await expect(
        page.locator('text=Not Found: Unknown subdomain')
      ).toBeVisible()
    })
  })
})
