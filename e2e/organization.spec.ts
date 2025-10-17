// 組織管理のE2Eテスト
import { test, expect } from '@playwright/test'

// テスト用のヘルパー関数: ログイン状態を作成
async function login(page: any, email: string, password: string) {
  await page.goto('http://localhost:3000/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/app\.localhost:3000/)
}

test.describe('組織管理', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にログイン
    await login(page, 'test@example.com', 'password123')
  })

  test.skip('組織作成フロー', async ({ page }) => {
    // TODO: サインアップフローに統合されたため、このテストは廃止
    // 新しいサインアップE2Eテストで代替する必要がある
  })

  test('組織設定の編集', async ({ page }) => {
    // 設定ページに移動
    await page.goto('http://app.localhost:3000/settings/organization')

    // 組織名を変更
    const newName = `更新された組織名 ${Date.now()}`
    await page.fill('input[name="name"]', newName)

    // 保存ボタンをクリック
    await page.click('button[type="submit"]')

    // 成功メッセージを確認
    await expect(page.locator('text=組織情報を更新しました')).toBeVisible()
  })

  test('組織の切り替え', async ({ page }) => {
    // ダッシュボードに移動
    await page.goto('http://app.localhost:3000/')

    // 組織スイッチャーをクリック
    await page.click('[data-testid="organization-switcher"]')

    // 組織一覧が表示されることを確認
    await expect(page.locator('[data-testid="organization-list"]')).toBeVisible()

    // 新しい組織を作成リンクが表示されることを確認
    await expect(page.locator('text=新しい組織を作成')).toBeVisible()
  })
})
