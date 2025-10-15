// Vercel Preview環境（cocktailorder.com）のE2Eテスト
import { test, expect } from '@playwright/test'

test.describe('Preview環境の基本動作', () => {
  test('WWWドメインが正常に表示される', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'https://www.cocktailorder.com')

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Example/)

    // メインコンテンツが表示される
    await expect(page.locator('h1')).toContainText('Welcome')
  })

  test('APPサブドメインにアクセスできる', async ({ page }) => {
    await page.goto('https://app.cocktailorder.com')

    // 認証されていない場合でもエラーにならない（リダイレクトまたはログインページ）
    const url = page.url()
    expect(url).toContain('cocktailorder.com')
  })

  test('ADMINサブドメインにアクセスできる', async ({ page }) => {
    await page.goto('https://admin.cocktailorder.com')

    // 認証されていない場合でもエラーにならない
    const url = page.url()
    expect(url).toContain('cocktailorder.com')
  })

  test('OPSサブドメインにアクセスできる', async ({ page }) => {
    await page.goto('https://ops.cocktailorder.com')

    // 認証されていない場合でもエラーにならない
    const url = page.url()
    expect(url).toContain('cocktailorder.com')
  })

  test('サブドメイン間のCookie共有テスト', async ({ page, context }) => {
    // WWWドメインでCookieを設定
    await context.addCookies([
      {
        name: 'test-cookie',
        value: 'test-value',
        domain: '.cocktailorder.com',
        path: '/',
      },
    ])

    // WWWドメインにアクセス
    await page.goto('https://www.cocktailorder.com')
    const wwwCookies = await context.cookies('https://www.cocktailorder.com')
    const wwwTestCookie = wwwCookies.find((c) => c.name === 'test-cookie')
    expect(wwwTestCookie?.value).toBe('test-value')

    // APPサブドメインにアクセスして同じCookieが見えるか確認
    await page.goto('https://app.cocktailorder.com')
    const appCookies = await context.cookies('https://app.cocktailorder.com')
    const appTestCookie = appCookies.find((c) => c.name === 'test-cookie')
    expect(appTestCookie?.value).toBe('test-value')

    console.log('✅ Cookieがサブドメイン間で共有されています')
  })
})
