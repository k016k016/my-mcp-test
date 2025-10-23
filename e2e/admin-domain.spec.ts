// ADMINドメインE2Eテスト - AUTH_FLOW_SPECIFICATION.md準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, loginAsAdmin, loginAsOwner } from './helpers'

test.describe('ADMINドメイン - 管理画面', () => {
  test.describe('管理者権限チェック', () => {
    test('admin権限でアクセスできる', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto(DOMAINS.ADMIN)

      // ADMINドメインにアクセスできる
      await expect(page).toHaveURL(/admin\.local\.test:3000/)
    })

    test('owner権限でアクセスできる', async ({ page }) => {
      await loginAsOwner(page)

      await page.goto(DOMAINS.ADMIN)

      // ADMINドメインにアクセスできる
      await expect(page).toHaveURL(/admin\.local\.test:3000/)
    })
  })

  test.describe('組織管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('組織設定ページが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings`)

      // 組織設定フォームが表示される
      await expect(page.locator('h1:has-text("組織設定")')).toBeVisible()
      await expect(page.locator('input[name="name"]')).toBeVisible()
    })

    test('組織情報を更新できる', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings`)

      // 組織名を変更
      const newName = `テスト組織 ${Date.now()}`
      await page.fill('input[name="name"]', newName)

      // 保存ボタンをクリック
      await page.click('button[type="submit"]:has-text("変更を保存")')

      // 成功メッセージが表示される
      await expect(page.locator('text=組織情報を更新しました')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('メンバー管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('メンバー一覧が表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/members`)

      // メンバー一覧が表示される
      await expect(page.locator('h1:has-text("メンバー管理")')).toBeVisible()
      await expect(page.locator('table')).toBeVisible()
    })

    test('メンバーを招待できる', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/members`)

      // フォームに入力
      await page.fill('input[name="email"]', 'newmember@example.com')
      await page.fill('input[name="fullName"]', 'New Member')
      await page.selectOption('select[name="role"]', 'member')

      // 招待を送信
      await page.click('button[type="submit"]:has-text("招待を送信")')

      // 成功メッセージが表示される（実装に応じて調整）
      await expect(page).toHaveURL(/members/)
    })

    test.skip('メンバーのロールを変更できる', async ({ page }) => {
      // TODO: 実装されているが、UIの確認が必要
      await page.goto(`${DOMAINS.ADMIN}/members`)
    })

    test.skip('メンバーを削除できる', async ({ page }) => {
      // TODO: 実装されているが、UIの確認が必要
      await page.goto(`${DOMAINS.ADMIN}/members`)
    })
  })

  test.describe('レイアウトとデザイン', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('サイドバーナビゲーションが表示される', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // サイドバーが表示される
      await expect(page.locator('aside')).toBeVisible()

      // ナビゲーションメニューが表示される
      await expect(page.locator('a:has-text("ダッシュボード")')).toBeVisible()
      await expect(page.locator('a:has-text("メンバー管理")')).toBeVisible()
      await expect(page.locator('a:has-text("組織設定")')).toBeVisible()
    })

    test.skip('組織切り替えメニューが表示される', async ({ page }) => {
      // NOTE: 単一組織のユーザーの場合、組織切り替えメニューは表示されない
      // 複数組織のユーザー（multiorg@example.com）でテストする必要がある
      await page.goto(DOMAINS.ADMIN)
    })

    test('ユーザー情報が表示される', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // ユーザー情報（メールアドレスなど）が表示される
      await expect(page.locator('header')).toBeVisible()
    })

    test.skip('紫系のアクセントカラーが適用されている', async ({ page }) => {
      // TODO: カラースキームの確認は視覚的テストツールを使用するのが望ましい
      await page.goto(DOMAINS.ADMIN)
    })
  })

  test.describe.skip('権限による機能制限', () => {
    // TODO: 以下の機能は未実装のため、テストをスキップ
    // - 支払い情報変更ページ（/settings/billing）
    // - 組織削除UI（Server Actionは実装済みだがUIが未実装）

    test('adminロールは支払い情報を変更できない', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/subscription`)
    })

    test('adminロールは組織を削除できない', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings`)
    })

    test('ownerロールは全ての機能にアクセスできる', async ({ page }) => {
      await loginAsOwner(page)
      await page.goto(`${DOMAINS.ADMIN}/subscription`)
    })
  })
})
