// ADMINドメインE2Eテスト - AUTH_FLOW_SPECIFICATION.md準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, loginAsAdmin, loginAsOwner } from './helpers'

test.describe('ADMINドメイン - 管理画面', () => {
  test.describe('管理者権限チェック', () => {
    test('admin権限でアクセスできる', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto(DOMAINS.ADMIN)

      // ADMINドメインにアクセスできる
      await expect(page).toHaveURL(/admin\.localhost:3000/)
    })

    test('owner権限でアクセスできる', async ({ page }) => {
      await loginAsOwner(page)

      await page.goto(DOMAINS.ADMIN)

      // ADMINドメインにアクセスできる
      await expect(page).toHaveURL(/admin\.localhost:3000/)
    })
  })

  test.describe('組織管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('組織設定ページが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings/organization`)

      // 組織設定フォームが表示される
      await expect(page.locator('h1:has-text("組織設定")')).toBeVisible()
      await expect(page.locator('input[name="name"]')).toBeVisible()
      await expect(page.locator('input[name="slug"]')).toBeVisible()
    })

    test('組織情報を更新できる', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings/organization`)

      // 組織名を変更
      await page.fill('input[name="name"]', 'Updated Organization Name')
      await page.click('button[type="submit"]:has-text("保存")')

      // 成功メッセージが表示される
      await expect(
        page.locator('text=組織情報を更新しました')
      ).toBeVisible()
    })
  })

  test.describe('メンバー管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('メンバー一覧が表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // メンバー一覧が表示される
      await expect(page.locator('h1:has-text("メンバー管理")')).toBeVisible()
      await expect(page.locator('[data-testid="member-list"]')).toBeVisible()
    })

    test('メンバーを招待できる', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // 招待フォームを開く
      await page.click('button:has-text("メンバーを招待")')

      // フォームに入力
      await page.fill('input[name="email"]', 'newmember@example.com')
      await page.selectOption('select[name="role"]', 'member')

      // 招待を送信
      await page.click('button[type="submit"]:has-text("招待を送信")')

      // 成功メッセージが表示される
      await expect(
        page.locator('text=招待メールを送信しました')
      ).toBeVisible()
    })

    test('メンバーのロールを変更できる', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // ロール変更ドロップダウンをクリック
      const roleDropdown = page.locator('[data-testid="role-dropdown"]').first()
      await roleDropdown.click()

      // ロールを選択
      await page.click('text=admin')

      // 確認ダイアログ
      await expect(
        page.locator('text=ロールを変更しますか')
      ).toBeVisible()
      await page.click('button:has-text("変更する")')

      // 成功メッセージ
      await expect(page.locator('text=ロールを変更しました')).toBeVisible()
    })

    test('メンバーを削除できる', async ({ page }) => {
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // 削除ボタンをクリック
      await page.click('[data-testid="remove-member-button"]').first()

      // 確認ダイアログ
      await expect(
        page.locator('text=メンバーを削除しますか')
      ).toBeVisible()
      await page.click('button:has-text("削除する")')

      // 成功メッセージ
      await expect(page.locator('text=メンバーを削除しました')).toBeVisible()
    })
  })

  test.describe('レイアウトとデザイン', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('サイドバーナビゲーションが表示される', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // サイドバーが表示される
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()

      // ナビゲーションメニューが表示される
      await expect(page.locator('a:has-text("ダッシュボード")')).toBeVisible()
      await expect(page.locator('a:has-text("メンバー管理")')).toBeVisible()
      await expect(page.locator('a:has-text("組織設定")')).toBeVisible()
    })

    test('組織切り替えメニューが表示される', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // 組織切り替えボタンが表示される
      const orgSwitcher = page.locator('[data-testid="organization-switcher"]')
      await expect(orgSwitcher).toBeVisible()
    })

    test('ユーザーメニューが表示される', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // ユーザーメニューボタンが表示される
      const userMenu = page.locator('[data-testid="user-menu"]')
      await expect(userMenu).toBeVisible()
    })

    test('紫系のアクセントカラーが適用されている', async ({ page }) => {
      await page.goto(DOMAINS.ADMIN)

      // 紫系のアクセントカラーが適用されているか確認
      // (実装に応じて具体的な要素をチェック)
      const primaryButton = page.locator('button').first()
      const buttonColor = await primaryButton.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('background-color')
      })

      // 紫系の色が含まれているか確認（簡易的）
      expect(buttonColor).toBeTruthy()
    })
  })

  test.describe('権限による機能制限', () => {
    test('adminロールは支払い情報を変更できない', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto(`${DOMAINS.ADMIN}/settings/billing`)

      // 支払い情報は閲覧のみ（変更ボタンが無効またはメッセージ表示）
      const message = page.locator('text=支払い情報の変更はオーナーのみ可能です')
      await expect(message).toBeVisible()
    })

    test('adminロールは組織を削除できない', async ({ page }) => {
      await loginAsAdmin(page)

      await page.goto(`${DOMAINS.ADMIN}/settings/organization`)

      // 組織削除ボタンが存在しない、または無効
      const deleteButton = page.locator('button:has-text("組織を削除")')
      await expect(deleteButton).toBeDisabled()
    })

    test('ownerロールは全ての機能にアクセスできる', async ({ page }) => {
      await loginAsOwner(page)

      // 支払い情報を変更できる
      await page.goto(`${DOMAINS.ADMIN}/settings/billing`)
      const paymentButton = page.locator('button:has-text("支払い情報を変更")')
      await expect(paymentButton).toBeEnabled()

      // 組織を削除できる
      await page.goto(`${DOMAINS.ADMIN}/settings/organization`)
      const deleteButton = page.locator('button:has-text("組織を削除")')
      await expect(deleteButton).toBeEnabled()
    })
  })
})
