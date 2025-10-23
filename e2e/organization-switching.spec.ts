// 組織切り替えE2Eテスト - AUTH_FLOW_SPECIFICATION.md セクション4準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, loginAsMultiOrg, loginAsMember } from './helpers'

// 同じユーザーで複数のテストを実行するため、シリアルモードで実行
// (Supabaseのセッション競合を回避)
test.describe.configure({ mode: 'serial' })

test.describe('組織切り替え - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('権限に基づくドメインリダイレクト', () => {
    test('組織A (ADMIN権限) → admin.xxx.com にリダイレクト', async ({
      page,
    }) => {
      // 複数組織に所属するユーザーでログイン (Owner Organization: owner, Admin Organization: admin)
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 組織切り替えメニューを開く
      await page.click('[data-testid="organization-switcher"]')

      // 現在選択中でない組織を選択（admin権限あり）
      // :not([data-testid="org-option-active"])で確実に別の組織を選択
      const adminOrgButton = page.locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])').first()
      await adminOrgButton.click()

      // ADMINドメインにリダイレクトされることを確認（ポート番号はオプショナル）
      await expect(page).toHaveURL(/admin\.local\.test(:\d+)?/, { timeout: 10000 })
    })

    test('組織B (owner権限) → admin.xxx.com にリダイレクト', async ({
      page,
    }) => {
      // 複数組織に所属するユーザーでログイン
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 組織切り替えメニューを開く
      await page.click('[data-testid="organization-switcher"]')

      // 現在選択中でない組織を選択（owner権限あり）
      // :not([data-testid="org-option-active"])で確実に別の組織を選択
      const ownerOrgButton = page.locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])').first()
      await ownerOrgButton.click()

      // ADMINドメインにリダイレクトされることを確認（ポート番号はオプショナル）
      await expect(page).toHaveURL(/admin\.local\.test(:\d+)?/, { timeout: 10000 })
    })

  })

  test.describe('権限がない組織への切り替え', () => {
    test('管理者権限がない組織を選択 → エラーメッセージ → app.xxx.com', async ({
      page,
    }) => {
      // 一般メンバーとしてログイン
      await loginAsMember(page)

      // ADMINドメインにアクセス試行
      await page.goto(DOMAINS.ADMIN)

      // エラーメッセージが表示される
      await expect(
        page.locator('text=管理者権限がありません')
      ).toBeVisible({ timeout: 5000 })

      // APPドメインにリダイレクトされる（ポート番号はオプショナル）
      await expect(page).toHaveURL(/app\.local\.test(:\d+)?/, { timeout: 5000 })
    })

    test('組織切り替え時、権限不足の場合はエラー表示', async ({ page }) => {
      // メンバーとしてログイン
      await loginAsMember(page)

      await page.goto(DOMAINS.APP)

      // 組織切り替えメニューを開く
      await page.click('[data-testid="organization-switcher"]')

      // 組織メニューが表示されるまで待機
      await page.waitForSelector('[data-testid="organization-menu"]', { state: 'visible' })

      // 管理者権限が必要な組織を選択しようとする
      // （この組織では一般メンバーのみの権限）
      // data-testidは org-option-{UUID} 形式なので、アクティブでない組織を選択
      const orgButtons = page.locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
      await orgButtons.first().click()

      // ADMINドメインへのアクセスを試みる
      await page.goto(DOMAINS.ADMIN)

      // 権限不足のエラーメッセージが表示される
      await expect(
        page.locator('text=管理者権限がありません')
      ).toBeVisible()

      // APPドメインにリダイレクトされる（ポート番号はオプショナル）
      await expect(page).toHaveURL(/app\.local\.test(:\d+)?/, { timeout: 5000 })
    })
  })

  test.describe('組織切り替えUI', () => {
    test('組織切り替えメニューに所属組織が全て表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 組織切り替えメニューを開く
      await page.click('[data-testid="organization-switcher"]')

      // メニューが表示される
      const menu = page.locator('[data-testid="organization-menu"]')
      await expect(menu).toBeVisible()

      // 複数の組織オプションが表示される
      const orgOptions = menu.locator('[data-testid^="org-option-"]')
      expect(await orgOptions.count()).toBeGreaterThan(0)
    })

    test('現在選択中の組織がハイライト表示される', async ({ page }) => {
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 組織切り替えメニューを開く
      await page.click('[data-testid="organization-switcher"]')

      // 現在選択中の組織がハイライトされている
      const activeOrg = page.locator('[data-testid="org-option-active"]')
      await expect(activeOrg).toHaveClass(/active|selected|bg-/)
    })

    test('組織ごとにロール（owner/admin/member）が表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 組織切り替えメニューを開く
      await page.click('[data-testid="organization-switcher"]')

      // 各組織のロールバッジが表示される
      const roleBadges = page.locator('[data-testid="role-badge"]')
      expect(await roleBadges.count()).toBeGreaterThan(0)

      // ロールテキストが正しい（owner/admin/member のいずれか）
      const roleTexts = await roleBadges.allTextContents()
      roleTexts.forEach((text) => {
        expect(['owner', 'admin', 'member', 'オーナー', '管理者', 'メンバー']).toContain(
          text.toLowerCase().trim()
        )
      })
    })
  })

  test.describe('組織切り替え時のデータロード', () => {
    test('組織切り替え後、新しい組織のデータが表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 最初の組織名を取得
      const firstOrgName = await page
        .locator('[data-testid="current-organization-name"]')
        .textContent()

      // 組織を切り替え
      await page.click('[data-testid="organization-switcher"]')
      await page.click('[data-testid="org-option-admin-2"]')

      // 新しい組織名が表示される
      const newOrgName = await page
        .locator('[data-testid="current-organization-name"]')
        .textContent()

      // 組織名が変わったことを確認
      expect(newOrgName).not.toBe(firstOrgName)
    })

    test('組織切り替え中はローディング状態が表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 組織を切り替え
      await page.click('[data-testid="organization-switcher"]')

      const switchPromise = page.click('[data-testid="org-option-admin-2"]')

      // ローディングインジケーターが表示される
      const loader = page.locator('[data-testid="loading-indicator"]')
      await expect(loader).toBeVisible({ timeout: 1000 })

      await switchPromise
    })
  })

  test.describe('組織切り替え時のCookie更新', () => {
    test('組織切り替え後、current_organization_id Cookieが更新される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)

      await page.goto(DOMAINS.APP)

      // 現在の組織IDを取得
      const initialCookies = await page.context().cookies()
      const initialOrgCookie = initialCookies.find(
        (c) => c.name === 'current_organization_id'
      )

      // 組織を切り替え
      await page.click('[data-testid="organization-switcher"]')
      await page.click('[data-testid="org-option-admin-2"]')

      // ページ遷移を待機
      await page.waitForLoadState('networkidle')

      // Cookieが更新されたことを確認
      const updatedCookies = await page.context().cookies()
      const updatedOrgCookie = updatedCookies.find(
        (c) => c.name === 'current_organization_id'
      )

      // Cookie値が変わったことを確認
      expect(updatedOrgCookie?.value).toBeDefined()
      expect(updatedOrgCookie?.value).not.toBe(initialOrgCookie?.value)
    })
  })

  test.describe('単一組織ユーザー', () => {
    test('単一組織のユーザーには組織切り替えが表示されない', async ({
      page,
    }) => {
      // owner@example.comでログイン（1つの組織のみ）
      await page.goto(`${DOMAINS.WWW}/login`, { waitUntil: 'networkidle' })

      await page.fill('input[name="email"]', 'owner@example.com')
      await page.fill('input[name="password"]', 'test1234')

      const submitButton = page.getByRole('button', {
        name: 'ログイン',
        exact: true,
      })
      await submitButton.click()

      // ADMINドメインにリダイレクトされるまで待機（owner権限があるため）
      await page.waitForURL(/admin\.local\.test(:\d+)?/, { timeout: 30000 })
      await page.waitForLoadState('networkidle')

      // 組織切り替えボタンが表示されない（単一組織のため）
      const switcher = page.locator('[data-testid="organization-switcher"]')
      await expect(switcher).not.toBeVisible()
    })
  })
})
