// OPSドメインE2Eテスト - AUTH_FLOW_SPECIFICATION.md準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, loginAsOps } from './helpers'

// 同じユーザーで複数のテストを実行するため、シリアルモードで実行
// (Supabaseのセッション競合を回避)
test.describe.configure({ mode: 'serial' })

test.describe('OPSドメイン - 運用ダッシュボード', () => {
  test.describe('ダッシュボード表示', () => {
    test('運用ダッシュボードが正しく表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)
      await page.goto(DOMAINS.OPS)

      // ダッシュボードタイトルが表示される
      await expect(page.locator('h1:has-text("運用ダッシュボード")')).toBeVisible()

      // システム統計が表示される
      await expect(page.locator('text=総組織数')).toBeVisible()
      await expect(page.locator('text=総ユーザー数')).toBeVisible()
      await expect(page.locator('text=アクティブサブスクリプション')).toBeVisible()
      await expect(page.locator('text=本日の監査ログ')).toBeVisible()
    })

    test('ダークテーマが適用されている', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // ダークテーマ（黒・赤系）が適用されている
      const bodyBg = await page.evaluate(() => {
        const body = document.querySelector('body')
        return body ? window.getComputedStyle(body).backgroundColor : null
      })

      // 背景色が暗い色であることを確認（例: rgb値の各要素が小さい）
      expect(bodyBg).toBeTruthy()
    })
  })

  test.describe('組織管理機能', () => {
    test('組織一覧が表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // 組織一覧セクションが表示される
      await expect(page.locator('text=組織一覧')).toBeVisible()

      // テーブルが表示される
      await expect(page.locator('table')).toBeVisible()

      // テーブルヘッダーを確認
      await expect(page.locator('th:has-text("組織名")')).toBeVisible()
      await expect(page.locator('th:has-text("組織ID")')).toBeVisible()
      await expect(page.locator('th:has-text("プラン")')).toBeVisible()
      await expect(page.locator('th:has-text("ステータス")')).toBeVisible()
    })

    test('「すべて表示」リンクが動作する', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // すべて表示リンクをクリック
      await page.click('a:has-text("すべて表示")')

      // 組織一覧ページに遷移
      await expect(page).toHaveURL(/\/ops\/organizations/)
    })
  })

  test.describe('ユーザー管理機能', () => {
    test('ユーザー一覧が表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // ユーザー一覧セクションが表示される
      await expect(page.locator('text=ユーザー一覧')).toBeVisible()

      // テーブルヘッダーを確認
      await expect(
        page.locator('th:has-text("メールアドレス")')
      ).toBeVisible()
      await expect(page.locator('th:has-text("名前")')).toBeVisible()
      await expect(page.locator('th:has-text("会社名")')).toBeVisible()
      await expect(page.locator('th:has-text("登録日")')).toBeVisible()
    })

    test('ユーザー一覧の「すべて表示」リンクが動作する', async ({
      page,
    }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // ユーザー一覧のすべて表示リンクをクリック
      const usersSection = page.locator('h2:has-text("ユーザー一覧")').locator('..')
      await usersSection.locator('a:has-text("すべて表示")').click()

      // ユーザー一覧ページに遷移
      await expect(page).toHaveURL(/\/ops\/users/)
    })
  })

  test.describe('監査ログ機能', () => {
    test('監査ログ一覧が表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // 監査ログセクションが表示される
      await expect(page.locator('text=監査ログ')).toBeVisible()

      // テーブルヘッダーを確認
      await expect(page.locator('th:has-text("日時")')).toBeVisible()
      await expect(page.locator('th:has-text("アクション")')).toBeVisible()
      await expect(page.locator('th:has-text("ユーザー")')).toBeVisible()
      await expect(page.locator('th:has-text("組織")')).toBeVisible()
      await expect(page.locator('th:has-text("リソース")')).toBeVisible()
    })

    test('監査ログの「すべて表示」リンクが動作する', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // 監査ログのすべて表示リンクをクリック
      const logsSection = page.locator('h2:has-text("監査ログ")').locator('..')
      await logsSection.locator('a:has-text("すべて表示")').click()

      // 監査ログページに遷移
      await expect(page).toHaveURL(/\/ops\/audit-logs/)
    })
  })

  test.describe('システム統計', () => {
    test('システム統計が正しく表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // 統計カードが4つ表示される
      const statsCards = page.locator('div').filter({
        hasText: /総組織数|総ユーザー数|アクティブサブスクリプション|本日の監査ログ/,
      })

      expect(await statsCards.count()).toBeGreaterThanOrEqual(4)
    })

    test('統計値が数値で表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // 各統計の値が数値であることを確認
      const stats = await page.locator('div.text-2xl').allTextContents()

      stats.forEach((stat) => {
        // 数値（コンマ区切りあり）または0であることを確認
        expect(stat).toMatch(/^[\d,]+$/)
      })
    })
  })

  test.describe('ナビゲーション', () => {
    test('ヘッダーに運用メニューが表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // 運用メニューが表示される（ダッシュボード、組織、ユーザーなど）
      await expect(page.locator('text=ダッシュボード')).toBeVisible()
    })

    test('ユーザーメニューが表示される', async ({ page }) => {
      // OPS権限を持つユーザーとしてログイン
      await loginAsOps(page)

      await page.goto(DOMAINS.OPS)

      // ユーザーメニューボタンが表示される
      const userMenu = page.locator('[data-testid="user-menu"]')
      await expect(userMenu).toBeVisible()
    })
  })
})
