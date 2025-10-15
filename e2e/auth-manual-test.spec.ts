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
    await page.click('text=サインアップ')
    await expect(page).toHaveURL(/\/signup/)

    // 3. メールとパスワードを入力
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)

    // 4. サインアップボタンをクリック
    await page.click('button[type="submit"]')

    // 5. メール確認がOFFなので、直接onboardingに遷移
    await expect(page).toHaveURL(/\/onboarding\/create-organization/, {
      timeout: 10000,
    })

    // 6. 組織名を入力
    await page.fill('input[name="name"]', 'テスト組織')

    // 7. 組織を作成
    await page.click('button[type="submit"]')

    // 8. APPドメインのホームページに遷移
    await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })

    console.log('✅ 新規ユーザー登録フロー完了')
    console.log(`📧 テストユーザー: ${testEmail}`)
  })

  test('Cookie共有の確認', async ({ page, context }) => {
    // 前のテストでログイン済みの状態で実行
    // まず新規ユーザーでログイン
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
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
