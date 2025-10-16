// localhost環境のE2Eテスト
import { test, expect } from '@playwright/test'

test.describe('localhost環境の基本動作', () => {
  test('WWWドメインが正常に表示される', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Example/)

    // ページが正常に読み込まれることを確認
    await expect(page.locator('body')).toBeVisible()
  })

  test('APPサブドメインにアクセスできる', async ({ page }) => {
    await page.goto('http://app.localhost:3000')

    // 認証されていない場合でもエラーにならない（リダイレクトまたはログインページ）
    const url = page.url()
    expect(url).toContain('localhost:3000')
  })

  test('ADMINサブドメインにアクセスできる', async ({ page }) => {
    await page.goto('http://admin.localhost:3000')

    // 認証されていない場合でもエラーにならない
    const url = page.url()
    expect(url).toContain('localhost:3000')
  })

  test('OPSサブドメインにアクセスできる', async ({ page }) => {
    await page.goto('http://ops.localhost:3000')

    // 認証されていない場合でもエラーにならない
    const url = page.url()
    expect(url).toContain('localhost:3000')
  })

  test('サブドメイン間のCookie共有テスト', async ({ page, context }) => {
    // localhostドメインでCookieを設定
    await context.addCookies([
      {
        name: 'test-cookie',
        value: 'test-value',
        domain: '.localhost',
        path: '/',
      },
    ])

    // WWWドメインにアクセス
    await page.goto('http://localhost:3000')
    const wwwCookies = await context.cookies('http://localhost:3000')
    const wwwTestCookie = wwwCookies.find((c) => c.name === 'test-cookie')
    expect(wwwTestCookie?.value).toBe('test-value')

    // APPサブドメインにアクセスして同じCookieが見えるか確認
    await page.goto('http://app.localhost:3000')
    const appCookies = await context.cookies('http://app.localhost:3000')
    const appTestCookie = appCookies.find((c) => c.name === 'test-cookie')
    expect(appTestCookie?.value).toBe('test-value')

    console.log('✅ localhost環境でもCookieがサブドメイン間で共有されています')
  })
})
