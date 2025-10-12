// メンバー管理のE2Eテスト
import { test, expect } from '@playwright/test'

// テスト用のヘルパー関数: ログイン状態を作成
async function loginAsOwner(page: any) {
  await page.goto('http://localhost:3000/login')
  await page.fill('input[name="email"]', 'owner@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/app\.localhost:3000/)
}

test.describe('メンバー管理', () => {
  test.beforeEach(async ({ page }) => {
    // オーナーとしてログイン
    await loginAsOwner(page)
  })

  test('メンバー招待フロー', async ({ page }) => {
    // メンバー設定ページに移動
    await page.goto('http://app.localhost:3000/settings/members')

    // 招待フォームを表示
    await page.click('button:has-text("メンバーを招待")')

    // フォームに入力
    const timestamp = Date.now()
    const inviteEmail = `invite-${timestamp}@example.com`

    await page.fill('input[name="email"]', inviteEmail)
    await page.selectOption('select[name="role"]', 'member')

    // 招待を送信
    await page.click('button[type="submit"]:has-text("招待を送信")')

    // 成功メッセージを確認
    await expect(page.locator('text=招待メールを送信しました')).toBeVisible()

    // 保留中の招待一覧に表示されることを確認
    await expect(page.locator(`text=${inviteEmail}`)).toBeVisible()
  })

  test('メンバーのロール変更', async ({ page }) => {
    // メンバー設定ページに移動
    await page.goto('http://app.localhost:3000/settings/members')

    // メンバー一覧が表示されることを確認
    await expect(page.locator('[data-testid="member-list"]')).toBeVisible()

    // ロール変更ドロップダウンをクリック
    await page.click('[data-testid="role-dropdown"]').first()

    // ロールを変更
    await page.click('text=admin')

    // 確認ダイアログが表示される
    await expect(page.locator('text=ロールを変更しますか')).toBeVisible()

    // 確認
    await page.click('button:has-text("変更する")')

    // 成功メッセージを確認
    await expect(page.locator('text=ロールを変更しました')).toBeVisible()
  })

  test('メンバーの削除', async ({ page }) => {
    // メンバー設定ページに移動
    await page.goto('http://app.localhost:3000/settings/members')

    // 削除ボタンをクリック
    await page.click('[data-testid="remove-member-button"]').first()

    // 確認ダイアログが表示される
    await expect(page.locator('text=メンバーを削除しますか')).toBeVisible()

    // 確認
    await page.click('button:has-text("削除する")')

    // 成功メッセージを確認
    await expect(page.locator('text=メンバーを削除しました')).toBeVisible()
  })

  test('招待リンクからの参加フロー', async ({ page, context }) => {
    // 招待トークンを含むURLに直接アクセス
    const inviteToken = 'test-invite-token-123'
    await page.goto(`http://app.localhost:3000/invite/${inviteToken}`)

    // ログインしていない場合はログインページにリダイレクト
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', 'newmember@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
    }

    // 招待受諾ページが表示される
    await expect(page.locator('text=組織への招待')).toBeVisible()

    // 招待を受諾
    await page.click('button:has-text("参加する")')

    // ダッシュボードにリダイレクトされる
    await expect(page).toHaveURL('http://app.localhost:3000/')
    await expect(page.locator('text=組織に参加しました')).toBeVisible()
  })
})
