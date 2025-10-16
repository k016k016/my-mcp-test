// 手動テスト用の認証フロー検証
import { test, expect } from '@playwright/test'

test.describe('認証フロー（メール確認OFF）', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  test('新規ユーザー登録フロー', async ({ page }) => {
    // 1. WWWドメインにアクセス
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Example/)

    // 2. サインアップページに移動
    await page.click('a[href="/signup"]:has-text("サインアップ")')
    await expect(page).toHaveURL(/\/signup/)

    // 3. フォームに入力（B2B必須フィールドを含む）
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.fill('input[name="companyName"]', 'テスト株式会社')
    await page.fill('input[name="contactName"]', 'テスト太郎')

    // 4. サインアップボタンをクリック
    await page.click('button[type="submit"]')

    // 5. メール確認がOFFなので、プラン選択ページに遷移
    await expect(page).toHaveURL(/\/onboarding\/select-plan/, {
      timeout: 10000,
    })

    console.log('✅ 新規ユーザー登録フロー完了（プラン選択まで）')
    console.log(`📧 テストユーザー: ${testEmail}`)
  })

  test('Cookie共有の確認', async ({ page, context }) => {
    // テスト用ユーザーでログイン（既存のテストユーザーを使用）
    const existingTestEmail = 'member@example.com'
    const existingTestPassword = 'MemberPassword123!'

    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', existingTestEmail)
    await page.fill('input[name="password"]', existingTestPassword)
    await page.click('button[type="submit"]:has-text("ログイン")')
    await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })

    // Cookieを確認
    const cookies = await context.cookies()
    console.log('🍪 Cookies:', cookies)

    const authCookies = cookies.filter(
      (c) =>
        c.name.includes('auth') ||
        c.name.includes('supabase') ||
        c.name.includes('sb-')
    )
    console.log('🔐 認証Cookie:', authCookies)

    // domainが .localhost になっているか確認
    const hasSharedDomainCookie = authCookies.some((c) =>
      c.domain.includes('.localhost')
    )
    expect(hasSharedDomainCookie).toBe(true)

    // ADMINドメインにアクセス（認証が維持されているはず）
    await page.goto('http://admin.localhost:3000')
    await page.waitForTimeout(2000)

    // OPSドメインにアクセス（認証が維持されているはず）
    await page.goto('http://ops.localhost:3000')
    await page.waitForTimeout(2000)

    console.log('✅ サブドメイン間でCookie共有が動作しています')
  })
})
