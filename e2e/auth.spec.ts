// 認証フローのE2Eテスト
import { test, expect } from '@playwright/test'

test.describe('認証フロー', () => {
  test('サインアップから組織作成までのフロー', async ({ page }) => {
    // サインアップページに移動
    await page.goto('http://localhost:3000/signup')

    // フォームに入力
    const timestamp = Date.now()
    const testEmail = `test-${timestamp}@example.com`
    const testPassword = 'TestPassword123!'

    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    // B2B必須フィールドを追加
    await page.fill('input[name="companyName"]', 'Test Company')
    await page.fill('input[name="contactName"]', 'Test User')

    // サインアップボタンをクリック
    await page.click('button[type="submit"]')

    // メール確認がOFFの環境では、プラン選択ページに遷移
    // メール確認がONの環境では、verify-emailに遷移
    // ここでは環境に応じて分岐（開発環境はメール確認OFF想定）
    await expect(page).toHaveURL(/\/(verify-email|onboarding\/select-plan)/, {
      timeout: 10000,
    })

    // プラン選択ページに遷移した場合は成功
    const url = page.url()
    if (url.includes('select-plan')) {
      await expect(page.locator('text=プランを選択してください')).toBeVisible()
    } else {
      await expect(page.locator('text=メールを確認してください')).toBeVisible()
    }
  })

  test('ログインフロー', async ({ page }) => {
    // ログインページに移動
    await page.goto('http://localhost:3000/login')

    // フォームに入力
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')

    // ログインボタンをクリック
    await page.click('button[type="submit"]')

    // ログイン成功後、APPドメインにリダイレクトされることを確認
    await expect(page).toHaveURL(/app\.localhost:3000/)
  })

  test('パスワードリセットフロー', async ({ page }) => {
    // パスワード忘れページに移動
    await page.goto('http://localhost:3000/forgot-password')

    // メールアドレスを入力
    await page.fill('input[name="email"]', 'test@example.com')

    // 送信ボタンをクリック
    await page.click('button[type="submit"]')

    // 成功メッセージを確認
    await expect(page.locator('text=パスワードリセットメールを送信しました')).toBeVisible()
  })

  test('Google OAuthボタンが表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    // Google OAuthボタンの存在を確認
    const googleButton = page.locator('text=Googleでログイン')
    await expect(googleButton).toBeVisible()
  })
})
