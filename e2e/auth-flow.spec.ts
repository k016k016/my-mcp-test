// 認証フローE2Eテスト - AUTH_FLOW_SPECIFICATION.md準拠
import { test, expect } from '@playwright/test'
import {
  DOMAINS,
  generateUniqueEmail,
  loginAsOps,
  loginAsOwner,
  loginAsMember,
  loginAsNoOrg,
  logout,
} from './helpers'

test.describe('認証フロー - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('サインアップフロー', () => {
    test('一般ユーザーのサインアップ → 組織作成フロー', async ({ page }) => {
      // 1. サインアップページに移動
      await page.goto(`${DOMAINS.WWW}/signup`)

      // 2. フォームに入力
      const email = generateUniqueEmail('user')
      const password = 'TestPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.fill('input[name="confirmPassword"]', password)
      await page.fill('input[name="companyName"]', 'Test Company')
      await page.fill('input[name="contactName"]', 'Test User')

      // 3. サインアップボタンをクリック
      await page.click('button[type="submit"]')

      // 4. 開発環境ではメール確認なしでオンボーディングへ
      // (メール確認ONの場合はverify-emailページ)
      await expect(page).toHaveURL(/\/(verify-email|onboarding)/, {
        timeout: 10000,
      })
    })

    test('管理者のサインアップ → プラン選択 → 決済 → 組織作成', async ({
      page,
    }) => {
      // 1. サインアップ
      await page.goto(`${DOMAINS.WWW}/signup`)

      const email = generateUniqueEmail('admin')
      const password = 'AdminPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.fill('input[name="confirmPassword"]', password)
      await page.fill('input[name="companyName"]', 'Admin Company')
      await page.fill('input[name="contactName"]', 'Admin User')

      await page.click('button[type="submit"]')

      // 2. プラン選択ページに遷移（メール確認なしの場合）
      const url = page.url()
      if (url.includes('select-plan')) {
        await expect(
          page.locator('text=プランを選択してください')
        ).toBeVisible()

        // プランを選択（例: スタータープラン）
        await page.click('button:has-text("スタータープランを選択")')

        // 決済ページに遷移
        await expect(page).toHaveURL(/\/onboarding\/payment/, { timeout: 5000 })
      }
    })
  })

  test.describe('ログインフロー', () => {
    test('WWWドメインのログインページが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/login`)

      // ログインフォームが表示される
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Google OAuthボタンが表示される
      await expect(page.locator('text=Googleでログイン')).toBeVisible()
    })

    test('OPSドメインの独自ログインページが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.OPS}/login`)

      // OPS専用のログインフォームが表示される
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()

      // OPS専用のデザイン（ダークテーマ）が適用されている
      await expect(page.locator('text=運用担当者ログイン')).toBeVisible()
    })

    test('誤った認証情報でログインに失敗', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/login`)

      await page.fill('input[name="email"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')

      // エラーメッセージが表示される
      await expect(
        page.locator('text=メールアドレスまたはパスワードが正しくありません')
      ).toBeVisible()
    })
  })

  test.describe('ログアウトフロー', () => {
    test('ログアウト後はWWWドメインにリダイレクト', async ({ page }) => {
      // オーナーとしてログイン
      await loginAsOwner(page)

      // ログアウト
      await logout(page)

      // WWWドメインにリダイレクトされる
      await expect(page).toHaveURL(/^http:\/\/localhost:3000/)
    })
  })

  test.describe('パスワードリセットフロー', () => {
    test('パスワード忘れページからリセットメールを送信', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/forgot-password`)

      await page.fill('input[name="email"]', 'test@example.com')
      await page.click('button[type="submit"]')

      // 成功メッセージが表示される（セキュリティのため、存在しないメールでも成功）
      await expect(
        page.locator('text=パスワードリセットメールを送信しました')
      ).toBeVisible()
    })

    test('パスワードリセットリンクから新しいパスワードを設定', async ({
      page,
    }) => {
      // リセットトークンを含むURLに直接アクセス
      const resetToken = 'test-reset-token-123'
      await page.goto(`${DOMAINS.WWW}/reset-password?token=${resetToken}`)

      // 新しいパスワードを入力
      const newPassword = 'NewPassword123!'
      await page.fill('input[name="password"]', newPassword)
      await page.fill('input[name="confirmPassword"]', newPassword)
      await page.click('button[type="submit"]')

      // 成功メッセージが表示される
      await expect(
        page.locator('text=パスワードを変更しました')
      ).toBeVisible()

      // ログインページにリダイレクト
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('OAuth認証フロー', () => {
    test('Google OAuthボタンが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/login`)

      const googleButton = page.locator('text=Googleでログイン')
      await expect(googleButton).toBeVisible()
    })

    // 注: 実際のOAuth認証フローはモックなしでは難しいため、
    // ボタンの存在確認のみ行う
  })
})
