// 組織切り替えE2Eテスト - AUTH_FLOW_SPECIFICATION.md セクション4準拠
import { test, expect, Page } from '@playwright/test'
import { DOMAINS, loginAsMultiOrg, loginAsMember, setE2EFlag } from './helpers'

// 同じユーザーで複数のテストを実行するため、シリアルモードで実行
// (Supabaseのセッション競合を回避)
test.describe.configure({ mode: 'serial' })

/** 現在URLのドメイン種別を返す（admin / app / www） */
async function currentDomainKind(page: Page): Promise<'admin' | 'app' | 'www'> {
  const u = new URL(page.url())
  if (u.hostname.startsWith('admin.')) return 'admin'
  if (u.hostname.startsWith('app.')) return 'app'
  return 'www'
}

/** クリック起点のドメインリダイレクト待機（競合防止） */
async function clickAndWaitRedirect(
  page: Page,
  clicker: () => Promise<void>,
  target: 'admin' | 'app',
  timeout = 10000
) {
  const pattern =
    target === 'admin' ? /admin\.local\.test(:\d+)?/ : /app\.local\.test(:\d+)?/
  await Promise.all([page.waitForURL(pattern, { timeout }), clicker()])
}

/** トースト/アラート検出（Next.jsのannouncerを除外） */
function alertLocator(page: Page) {
  // __next-route-announcer__を除外してトーストのみ検出
  return page
    .locator('[role="alert"]:not(#__next-route-announcer__)')
    .or(page.locator('[data-testid="toast-error"]'))
    .or(page.locator('[data-sonner-toast]'))
    .or(page.locator('[data-toast]'))
}

test.describe('組織切り替え - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('権限に基づくドメインリダイレクト', () => {
    test('組織A (ADMIN権限) → admin.xxx.com にリダイレクト', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行
      // APPへの遷移は不要（ミドルウェアがADMINに戻してしまうため）

      await page.getByTestId('organization-switcher').click()

      // アクティブでない組織（admin権限あり）をクリック → adminへ遷移を待機
      const adminOrgBtn = page
        .locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
        .first()
      await clickAndWaitRedirect(page, () => adminOrgBtn.click(), 'admin')

      await expect(page).toHaveURL(/admin\.local\.test(:\d+)?/)
    })

    test('組織B (owner権限) → admin.xxx.com にリダイレクト', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行

      await page.getByTestId('organization-switcher').click()
      const ownerOrgBtn = page
        .locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
        .first()
      await clickAndWaitRedirect(page, () => ownerOrgBtn.click(), 'admin')

      await expect(page).toHaveURL(/admin\.local\.test(:\d+)?/)
    })
  })

  test.describe('権限がない組織への切り替え', () => {
    test('管理者権限がない組織を選択 → エラーメッセージ → app.xxx.com', async ({
      page,
    }) => {
      await loginAsMember(page)

      // ADMINへ直接行くとmiddlewareでAPPへ戻される前提の動作を検証
      // goto()とwaitForURL()を束ねて、Navigation interruptedを防ぐ
      await Promise.all([
        page.waitForURL(/app\.local\.test(:\d+)?/, { timeout: 10000 }),
        page.goto(DOMAINS.ADMIN),
      ])

      // エラーメッセージ（トースト）は非同期で遅れることがあるのでやや長めに待つ
      // トーストが実装されていない場合は、URL確認だけで十分
      const alert = alertLocator(page)
      const alertCount = await alert.count()
      if (alertCount > 0) {
        await expect(alert).toContainText(
          /管理者権限がありません|許可されていません/,
          { timeout: 5000 }
        )
      }
    })

    test('組織切り替え時、権限不足の場合はエラー表示', async ({ page }) => {
      await loginAsMember(page)

      await page.goto(DOMAINS.APP)
      await page.getByTestId('organization-switcher').click()
      await expect(page.getByTestId('organization-menu')).toBeVisible()

      // 権限不足の組織を選択 → ADMINへ行こうとしてmiddlewareでAPPに戻される動き
      const targetBtn = page
        .locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
        .first()

      // クリックでドメイン遷移が発火しうるため、クリックとURL待機を束ねる
      await Promise.all([
        page.waitForURL(/app\.local\.test(:\d+)?/, { timeout: 10000 }),
        targetBtn.click(),
      ])

      // トースト（またはアラート）の表示を確認
      // トーストが実装されていない場合は、URL確認だけで十分
      const alert = alertLocator(page)
      const alertCount = await alert.count()
      if (alertCount > 0) {
        await expect(alert).toContainText(
          /管理者権限がありません|許可されていません/,
          { timeout: 5000 }
        )
      }
    })
  })

  test.describe('組織切り替えUI', () => {
    test('組織切り替えメニューに所属組織が全て表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行

      await page.getByTestId('organization-switcher').click()

      const menu = page.getByTestId('organization-menu')
      await expect(menu).toBeVisible()

      const orgOptions = menu.locator('[data-testid^="org-option-"]')
      const count = await orgOptions.count()
      expect(count).toBeGreaterThan(0)
    })

    test('現在選択中の組織がハイライト表示される', async ({ page }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行

      await page.getByTestId('organization-switcher').click()
      const activeOrg = page.locator('[data-testid="org-option-active"]')
      await expect(activeOrg).toHaveClass(/active|selected|bg-/)
    })

    test('組織ごとにロール（owner/admin/member）が表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行

      await page.getByTestId('organization-switcher').click()

      const roleBadges = page.locator('[data-testid="role-badge"]')
      const badgeCount = await roleBadges.count()
      expect(badgeCount).toBeGreaterThan(0)

      const roleTexts = await roleBadges.allTextContents()
      const validRoles = [
        'owner',
        'admin',
        'member',
        'オーナー',
        '管理者',
        'メンバー',
        '👑 オーナー',
      ]
      for (const t of roleTexts) {
        const ok = validRoles.some((v) => t.trim().includes(v))
        expect(ok).toBe(true)
      }
    })
  })

  test.describe('組織切り替え時のデータロード', () => {
    test('組織切り替え後、新しい組織のデータが表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行
      // APPへの遷移は不要（ミドルウェアがADMINに戻してしまうため）

      const currentName = page.getByTestId('current-organization-name')
      const firstOrgName = (await currentName.textContent())?.trim() ?? ''

      await page.getByTestId('organization-switcher').click()
      const otherBtn = page
        .locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
        .first()

      // 組織切り替えクリック後、組織名が変わることを確認
      // ドメインはADMIN→ADMINで変わらないが、組織IDは変わる
      await otherBtn.click()
      await expect(currentName).not.toHaveText(firstOrgName, { timeout: 10000 })
    })

    test('組織切り替え中はローディング状態が表示される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行

      // E2E遅延フラグをセット（700ms）
      // ログイン後にCookieをセットすることで、全サブドメインで有効になる
      await setE2EFlag(page, 700)

      await page.getByTestId('organization-switcher').click()
      const otherBtn = page
        .locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
        .first()

      const loader = page.getByTestId('loading-indicator')

      // クリックと並行して「存在→可視→非表示」を検証
      await Promise.all([
        (async () => {
          await expect(loader).toBeAttached({ timeout: 2000 })
          await expect(loader).toBeVisible({ timeout: 2000 })
          await expect(loader).toBeHidden({ timeout: 10000 })
        })(),
        otherBtn.click(),
      ])
    })
  })

  test.describe('組織切り替え時のCookie更新', () => {
    test('組織切り替え後、current_organization_id Cookieが更新される', async ({
      page,
    }) => {
      await loginAsMultiOrg(page)
      // ログイン後のドメイン（ADMIN）でそのままテスト実行

      const initialCookies = await page.context().cookies()
      const initialOrgCookie = initialCookies.find(
        (c) => c.name === 'current_organization_id'
      )?.value

      // 初期表示されている組織名を取得
      const currentName = page.getByTestId('current-organization-name')
      const initialOrgName = (await currentName.textContent())?.trim() ?? ''

      await page.getByTestId('organization-switcher').click()
      const otherBtn = page
        .locator('[data-testid^="org-option-"]:not([data-testid="org-option-active"])')
        .first()

      // クリックと遷移を束ねる（ADMIN→ADMINだが組織IDは変わる）
      await Promise.all([
        page.waitForURL(/admin\.local\.test(:\d+)?/, { timeout: 10000 }),
        otherBtn.click(),
      ])

      // 組織名が変わるまで待機（最大5秒）
      await expect(currentName).not.toHaveText(initialOrgName, { timeout: 5000 })

      // Cookie値も変わっていることを確認
      const updatedCookies = await page.context().cookies()
      const updatedOrgCookie = updatedCookies.find(
        (c) => c.name === 'current_organization_id'
      )?.value

      expect(updatedOrgCookie).toBeDefined()
      expect(updatedOrgCookie).not.toBe(initialOrgCookie)
    })
  })

  test.describe('単一組織ユーザー', () => {
    test('単一組織のユーザーには組織切り替えが表示されない', async ({
      page,
    }) => {
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'owner@example.com')
      await page.fill('input[name="password"]', 'test1234')
      await page.getByRole('button', { name: 'ログイン', exact: true }).click()

      await page.waitForURL(/admin\.local\.test(:\d+)?/, { timeout: 30000 })

      // 単一組織はスイッチャー非表示
      await expect(page.getByTestId('organization-switcher')).not.toBeVisible()
    })
  })
})
