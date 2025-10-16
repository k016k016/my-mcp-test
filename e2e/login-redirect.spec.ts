// ログイン後のリダイレクトE2Eテスト - AUTH_FLOW_SPECIFICATION.md セクション3準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, generateUniqueEmail } from './helpers'

test.describe('ログイン後のリダイレクト - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('一般ユーザー・管理者ログイン（WWW/login）', () => {
    test('組織未所属 → オンボーディングへリダイレクト', async ({ page }) => {
      // 組織未所属のユーザーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)

      const email = 'noorg@example.com'
      const password = 'NoOrgPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // オンボーディングページにリダイレクトされる
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 })

      // 組織作成フォームが表示される
      await expect(
        page.locator('h1:has-text("組織を作成")')
      ).toBeVisible()
    })

    test('管理者権限あり → admin.xxx.com へリダイレクト', async ({
      page,
    }) => {
      // 管理者権限を持つユーザーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)

      const email = 'admin@example.com'
      const password = 'AdminPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // ADMINドメインにリダイレクトされる
      await expect(page).toHaveURL(/admin\.localhost:3000/, {
        timeout: 10000,
      })
    })

    test('一般ユーザー → app.xxx.com へリダイレクト', async ({ page }) => {
      // 一般ユーザーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)

      const email = 'member@example.com'
      const password = 'MemberPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // APPドメインにリダイレクトされる
      await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })
    })

    test('オーナー権限あり → admin.xxx.com へリダイレクト', async ({
      page,
    }) => {
      // オーナー権限を持つユーザーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)

      const email = 'owner@example.com'
      const password = 'OwnerPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // ADMINドメインにリダイレクトされる（ownerもADMINドメインへ）
      await expect(page).toHaveURL(/admin\.localhost:3000/, {
        timeout: 10000,
      })
    })
  })

  test.describe('運用担当者ログイン（OPS/login）', () => {
    test('運用担当者 → ops.xxx.com へリダイレクト', async ({ page }) => {
      // OPSドメインのログインページにアクセス
      await page.goto(`${DOMAINS.OPS}/login`)

      const email = 'ops@example.com'
      const password = 'OpsPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // OPSドメインにリダイレクトされる
      await expect(page).toHaveURL(/ops\.localhost:3000/, { timeout: 10000 })

      // 運用ダッシュボードが表示される
      await expect(page.locator('h1:has-text("運用ダッシュボード")')).toBeVisible()
    })

    test('OPS権限がないユーザーはログインできない', async ({ page }) => {
      // OPSドメインのログインページにアクセス
      await page.goto(`${DOMAINS.OPS}/login`)

      // 一般ユーザーの認証情報を使用
      const email = 'member@example.com'
      const password = 'MemberPassword123!'

      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // エラーメッセージが表示される
      await expect(
        page.locator('text=運用担当者権限がありません')
      ).toBeVisible()

      // OPSログインページに留まる
      await expect(page).toHaveURL(/ops\.localhost:3000\/login/)
    })
  })

  test.describe('リダイレクト後のセッション状態', () => {
    test('リダイレクト後もログイン状態が維持される', async ({ page }) => {
      // ログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'AdminPassword123!')
      await page.click('button[type="submit"]')

      // ADMINドメインにリダイレクト
      await expect(page).toHaveURL(/admin\.localhost:3000/, {
        timeout: 10000,
      })

      // ユーザーメニューが表示される（ログイン状態）
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

      // ログインボタンが表示されない
      await expect(page.locator('text=ログイン')).not.toBeVisible()
    })

    test('異なるドメインでもセッションが共有される', async ({ page }) => {
      // WWWドメインでログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'AdminPassword123!')
      await page.click('button[type="submit"]')

      // ADMINドメインにリダイレクト
      await expect(page).toHaveURL(/admin\.localhost:3000/, {
        timeout: 10000,
      })

      // APPドメインに直接アクセス
      await page.goto(DOMAINS.APP)

      // ログインページにリダイレクトされず、APPドメインにアクセスできる
      await expect(page).toHaveURL(/app\.localhost:3000/)

      // ユーザーメニューが表示される（セッションが共有されている）
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })
  })

  test.describe('リダイレクトループ防止', () => {
    test('無限リダイレクトループが発生しない', async ({ page }) => {
      // ログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'member@example.com')
      await page.fill('input[name="password"]', 'MemberPassword123!')
      await page.click('button[type="submit"]')

      // APPドメインにリダイレクト
      await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })

      // 10秒以内に安定することを確認（リダイレクトループがない）
      await page.waitForLoadState('networkidle', { timeout: 10000 })

      // URLが変わらないことを確認
      const finalUrl = page.url()
      await page.waitForTimeout(2000)
      expect(page.url()).toBe(finalUrl)
    })

    test('ログイン後に元のページにリダイレクトされる（returnUrl）', async ({
      page,
    }) => {
      // 特定のページにアクセス（未認証）
      const targetPath = '/dashboard/analytics'
      await page.goto(`${DOMAINS.APP}${targetPath}`)

      // ログインページにリダイレクトされる
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

      // ログイン
      await page.fill('input[name="email"]', 'member@example.com')
      await page.fill('input[name="password"]', 'MemberPassword123!')
      await page.click('button[type="submit"]')

      // 元のページにリダイレクトされる
      await expect(page).toHaveURL(new RegExp(targetPath), { timeout: 10000 })
    })
  })

  test.describe('複数組織所属時のリダイレクト', () => {
    test('最後に選択した組織のドメインにリダイレクト', async ({ page }) => {
      // 複数組織に所属するユーザーでログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'AdminPassword123!')
      await page.click('button[type="submit"]')

      // 最後に選択した組織の権限に応じたドメインにリダイレクト
      // （最後に選択した組織がCookieに保存されている）
      const url = page.url()
      expect(url).toMatch(/app\.localhost:3000|admin\.localhost:3000/)
    })

    test('Cookieに保存された組織がない場合、デフォルト組織を選択', async ({
      page,
    }) => {
      // Cookieをクリア
      await page.context().clearCookies()

      // ログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'AdminPassword123!')
      await page.click('button[type="submit"]')

      // デフォルト組織（最初に作成した組織など）のドメインにリダイレクト
      const url = page.url()
      expect(url).toMatch(/app\.localhost:3000|admin\.localhost:3000/)

      // current_organization_id Cookieが設定される
      const cookies = await page.context().cookies()
      const orgCookie = cookies.find((c) => c.name === 'current_organization_id')
      expect(orgCookie).toBeDefined()
    })
  })

  test.describe('OAuth ログイン後のリダイレクト', () => {
    test('Google OAuth後のリダイレクトも同じルールに従う', async ({
      page,
    }) => {
      // 注: 実際のOAuthフローはモックが必要なため、ここでは簡易的なテスト

      // OAuthコールバックURLに直接アクセス（モック）
      await page.goto(
        `${DOMAINS.WWW}/auth/callback?provider=google&code=mock-code`
      )

      // 権限に応じたドメインにリダイレクトされる
      const url = page.url()
      expect(url).toMatch(
        /app\.localhost:3000|admin\.localhost:3000|onboarding/
      )
    })
  })

  test.describe('エラー時のリダイレクト', () => {
    test('ログインエラー時はログインページに留まる', async ({ page }) => {
      await page.goto(`${DOMAINS.WWW}/login`)

      await page.fill('input[name="email"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')

      // エラーメッセージが表示される
      await expect(
        page.locator('text=メールアドレスまたはパスワードが正しくありません')
      ).toBeVisible()

      // ログインページに留まる
      await expect(page).toHaveURL(/\/login/)
    })

    test('セッションエラー時はWWW/loginにリダイレクト', async ({ page }) => {
      // セッションをクリア
      await page.context().clearCookies()

      // 認証が必要なページにアクセス
      await page.goto(DOMAINS.APP)

      // WWWログインページにリダイレクト
      await expect(page).toHaveURL(/localhost:3000\/login/, { timeout: 5000 })
    })
  })
})
