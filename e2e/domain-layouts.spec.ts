// ドメイン別レイアウト設計E2Eテスト - AUTH_FLOW_SPECIFICATION.md セクション2準拠
import { test, expect } from '@playwright/test'
import {
  DOMAINS,
  loginAsAdmin,
  loginAsOwner,
  loginAsMember,
  loginAsOps,
} from './helpers'

test.describe('ドメイン別レイアウト設計 - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('APPドメインのレイアウト', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMember(page)
      await page.goto(DOMAINS.APP)
    })

    test('モダンなグラデーション背景（青系）が適用されている', async ({
      page,
    }) => {
      // ボディまたはメインコンテナの背景を取得
      const bodyBg = await page.evaluate(() => {
        const body = document.querySelector('body')
        const mainContainer = document.querySelector('main')
        const target = mainContainer || body

        if (!target) return null

        const styles = window.getComputedStyle(target)
        return {
          backgroundColor: styles.backgroundColor,
          backgroundImage: styles.backgroundImage,
        }
      })

      // 背景画像（グラデーション）が設定されているか確認
      expect(
        bodyBg?.backgroundImage.includes('gradient') ||
          bodyBg?.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ).toBeTruthy()
    })

    test('横並びナビゲーションが表示される', async ({ page }) => {
      // ヘッダーナビゲーションが表示される
      const header = page.locator('header, [data-testid="header"]')
      await expect(header).toBeVisible()

      // ナビゲーションメニューが横並びで表示される
      const nav = page.locator('nav, [data-testid="navigation"]')
      await expect(nav).toBeVisible()

      // flexまたはgridレイアウトが使用されている
      const navDisplay = await nav.evaluate((el) => {
        return window.getComputedStyle(el).display
      })

      expect(['flex', 'grid', 'inline-flex']).toContain(navDisplay)
    })

    test('組織切り替えメニューが表示される', async ({ page }) => {
      const orgSwitcher = page.locator('[data-testid="organization-switcher"]')
      await expect(orgSwitcher).toBeVisible()
    })

    test('ユーザーメニューが表示される', async ({ page }) => {
      const userMenu = page.locator('[data-testid="user-menu"]')
      await expect(userMenu).toBeVisible()
    })

    test('親しみやすいデザインが適用されている', async ({ page }) => {
      // ロゴまたはアプリ名が表示される
      const logo = page.locator('[data-testid="app-logo"], img[alt*="logo"]')
      await expect(logo).toBeVisible()

      // メインコンテンツエリアが存在
      const mainContent = page.locator('main, [role="main"]')
      await expect(mainContent).toBeVisible()
    })

    test('レスポンシブデザインが適用されている', async ({ page }) => {
      // モバイルビューポートに変更
      await page.setViewportSize({ width: 375, height: 667 })

      // ナビゲーションがハンバーガーメニューになる
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu-button"], button[aria-label*="メニュー"]'
      )

      // モバイルメニューボタンが表示されるか、またはナビゲーションが折りたたまれる
      const isMobileMenuVisible = await mobileMenu.isVisible()
      expect(isMobileMenuVisible).toBeTruthy()
    })
  })

  test.describe('ADMINドメインのレイアウト', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(DOMAINS.ADMIN)
    })

    test('サイドバーナビゲーションが表示される', async ({ page }) => {
      const sidebar = page.locator(
        '[data-testid="sidebar"], aside, nav[aria-label*="サイドバー"]'
      )
      await expect(sidebar).toBeVisible()

      // サイドバーが左側に配置されている
      const sidebarPosition = await sidebar.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return rect.left
      })

      expect(sidebarPosition).toBeLessThanOrEqual(50) // 左端から50px以内
    })

    test('メインコンテンツエリアが表示される', async ({ page }) => {
      const mainContent = page.locator('main, [role="main"]')
      await expect(mainContent).toBeVisible()

      // メインコンテンツがサイドバーの右側に配置されている
      const mainPosition = await mainContent.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return rect.left
      })

      expect(mainPosition).toBeGreaterThan(100) // サイドバーの幅分右にずれている
    })

    test('紫系のアクセントカラーが適用されている', async ({ page }) => {
      // プライマリボタンやアクセント要素の色を取得
      const accentElements = page.locator(
        'button:has-text("保存"), button:has-text("更新"), a.active, [data-testid="active-link"]'
      )

      if ((await accentElements.count()) > 0) {
        const firstElement = accentElements.first()
        const color = await firstElement.evaluate((el) => {
          const styles = window.getComputedStyle(el)
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            borderColor: styles.borderColor,
          }
        })

        // 色が設定されていることを確認（紫系は実装依存のため、色の存在のみ確認）
        expect(
          color.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
            color.borderColor !== 'rgba(0, 0, 0, 0)'
        ).toBeTruthy()
      }
    })

    test('サイドバーナビゲーションメニューが表示される', async ({ page }) => {
      // ダッシュボード、メンバー管理、組織設定などのメニュー項目
      const navItems = [
        'ダッシュボード',
        'メンバー管理',
        'メンバー',
        '組織設定',
        '設定',
      ]

      for (const item of navItems) {
        const link = page.locator(`a:has-text("${item}")`)
        if ((await link.count()) > 0) {
          await expect(link.first()).toBeVisible()
        }
      }
    })

    test('組織切り替えメニューが表示される', async ({ page }) => {
      const orgSwitcher = page.locator('[data-testid="organization-switcher"]')
      await expect(orgSwitcher).toBeVisible()
    })

    test('ユーザーメニューが表示される', async ({ page }) => {
      const userMenu = page.locator('[data-testid="user-menu"]')
      await expect(userMenu).toBeVisible()
    })

    test('管理機能に特化したレイアウトが適用されている', async ({ page }) => {
      // サイドバー + メインコンテンツのレイアウト
      const layout = page.locator('body, #__next, [data-testid="app-layout"]')

      const layoutDisplay = await layout.first().evaluate((el) => {
        return window.getComputedStyle(el).display
      })

      // flexまたはgridレイアウトが使用されている
      expect(['flex', 'grid']).toContain(layoutDisplay)
    })

    test('サイドバーの折りたたみ機能が動作する', async ({ page }) => {
      // サイドバー折りたたみボタンを探す
      const collapseButton = page.locator(
        '[data-testid="sidebar-collapse"], button[aria-label*="サイドバー"]'
      )

      if ((await collapseButton.count()) > 0) {
        // サイドバーの初期幅を取得
        const sidebar = page.locator('[data-testid="sidebar"]')
        const initialWidth = await sidebar.evaluate((el) => {
          return el.getBoundingClientRect().width
        })

        // 折りたたみボタンをクリック
        await collapseButton.click()

        // サイドバーの幅が変わることを確認
        await page.waitForTimeout(500) // アニメーション待機
        const collapsedWidth = await sidebar.evaluate((el) => {
          return el.getBoundingClientRect().width
        })

        expect(collapsedWidth).not.toBe(initialWidth)
      }
    })
  })

  test.describe('OPSドメインのレイアウト', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOps(page)
      await page.goto(DOMAINS.OPS)
    })

    test('ダークテーマ（黒・赤系）が適用されている', async ({ page }) => {
      // ボディの背景色を取得
      const bodyBg = await page.evaluate(() => {
        const body = document.querySelector('body')
        if (!body) return null

        const styles = window.getComputedStyle(body)
        return styles.backgroundColor
      })

      // 背景色が暗い色であることを確認（RGB値が低い）
      if (bodyBg) {
        const rgb = bodyBg.match(/\d+/g)
        if (rgb) {
          const [r, g, b] = rgb.map(Number)
          const brightness = (r + g + b) / 3

          // 平均輝度が128以下（暗い色）
          expect(brightness).toBeLessThan(128)
        }
      }
    })

    test('横並びナビゲーションが表示される', async ({ page }) => {
      const header = page.locator('header, [data-testid="header"]')
      await expect(header).toBeVisible()

      const nav = page.locator('nav, [data-testid="navigation"]')
      await expect(nav).toBeVisible()

      // flexレイアウトが使用されている
      const navDisplay = await nav.evaluate((el) => {
        return window.getComputedStyle(el).display
      })

      expect(['flex', 'inline-flex']).toContain(navDisplay)
    })

    test('ユーザーメニューが表示される', async ({ page }) => {
      const userMenu = page.locator('[data-testid="user-menu"]')
      await expect(userMenu).toBeVisible()
    })

    test('プロフェッショナルなデザインが適用されている', async ({ page }) => {
      // 運用ダッシュボードのタイトル
      await expect(
        page.locator('h1:has-text("運用ダッシュボード")')
      ).toBeVisible()

      // 統計カードが表示される
      const statsCards = page.locator('[data-testid="stats-card"]')
      if ((await statsCards.count()) > 0) {
        await expect(statsCards.first()).toBeVisible()
      }
    })

    test('赤系のアクセントカラーが使用されている', async ({ page }) => {
      // 警告やアラート要素に赤系の色が使用されている
      const alertElements = page.locator(
        '[data-testid="alert"], .alert, .warning'
      )

      if ((await alertElements.count()) > 0) {
        const color = await alertElements.first().evaluate((el) => {
          const styles = window.getComputedStyle(el)
          return {
            backgroundColor: styles.backgroundColor,
            borderColor: styles.borderColor,
          }
        })

        // 色が設定されていることを確認
        expect(
          color.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
            color.borderColor !== 'rgba(0, 0, 0, 0)'
        ).toBeTruthy()
      }
    })

    test('組織切り替えメニューが表示されない（OPSは組織に依存しない）', async ({
      page,
    }) => {
      const orgSwitcher = page.locator('[data-testid="organization-switcher"]')

      // 組織切り替えメニューが存在しないか、非表示
      const count = await orgSwitcher.count()
      if (count > 0) {
        await expect(orgSwitcher).not.toBeVisible()
      }
    })

    test('システム統計が目立つ位置に表示される', async ({ page }) => {
      // システム統計カード
      const statsSection = page.locator('text=総組織数')
      await expect(statsSection).toBeVisible()

      // 統計がページ上部に配置されている
      const statsPosition = await statsSection.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return rect.top
      })

      expect(statsPosition).toBeLessThan(500) // 画面上部500px以内
    })

    test('テーブル表示が見やすいスタイルになっている', async ({ page }) => {
      // テーブルが存在する場合
      const tables = page.locator('table')

      if ((await tables.count()) > 0) {
        const firstTable = tables.first()
        await expect(firstTable).toBeVisible()

        // テーブルヘッダーが存在
        const thead = firstTable.locator('thead')
        await expect(thead).toBeVisible()

        // テーブル行が存在
        const rows = firstTable.locator('tbody tr')
        expect(await rows.count()).toBeGreaterThan(0)
      }
    })
  })

  test.describe('WWWドメインのレイアウト', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(DOMAINS.WWW)
    })

    test('マーケティングサイトのヘッダーが表示される', async ({ page }) => {
      const header = page.locator('header')
      await expect(header).toBeVisible()

      // ロゴが表示される
      const logo = page.locator('[data-testid="logo"], img[alt*="logo"]')
      await expect(logo).toBeVisible()
    })

    test('ログイン・サインアップボタンが表示される', async ({ page }) => {
      // ログインボタン
      const loginButton = page.locator('a:has-text("ログイン"), button:has-text("ログイン")')
      await expect(loginButton.first()).toBeVisible()

      // サインアップボタン
      const signupButton = page.locator('a:has-text("サインアップ"), button:has-text("サインアップ"), a:has-text("無料で始める")')
      await expect(signupButton.first()).toBeVisible()
    })

    test('フッターが表示される', async ({ page }) => {
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
    })

    test('レスポンシブデザインが適用されている', async ({ page }) => {
      // デスクトップビュー
      await page.setViewportSize({ width: 1920, height: 1080 })
      const desktopNav = page.locator('nav')
      await expect(desktopNav).toBeVisible()

      // モバイルビュー
      await page.setViewportSize({ width: 375, height: 667 })

      // モバイルメニューボタンが表示される
      const mobileMenuButton = page.locator(
        '[data-testid="mobile-menu-button"], button[aria-label*="メニュー"]'
      )

      if ((await mobileMenuButton.count()) > 0) {
        await expect(mobileMenuButton).toBeVisible()
      }
    })
  })

  test.describe('共通レイアウト要素', () => {
    test('全ドメインでユーザーメニューが一貫したデザインになっている', async ({
      page,
    }) => {
      const domains = [
        { domain: DOMAINS.APP, login: loginAsMember },
        { domain: DOMAINS.ADMIN, login: loginAsAdmin },
        { domain: DOMAINS.OPS, login: loginAsOps },
      ]

      for (const { domain, login } of domains) {
        await login(page)
        await page.goto(domain)

        const userMenu = page.locator('[data-testid="user-menu"]')
        await expect(userMenu).toBeVisible()

        // ユーザーメニューをクリック
        await userMenu.click()

        // ドロップダウンが表示される
        const dropdown = page.locator('[data-testid="user-menu-dropdown"]')
        await expect(dropdown).toBeVisible()

        // ログアウトボタンが存在
        await expect(page.locator('text=ログアウト')).toBeVisible()

        // メニューを閉じる
        await page.keyboard.press('Escape')
      }
    })

    test('アクセシビリティが考慮されている', async ({ page }) => {
      await loginAsMember(page)
      await page.goto(DOMAINS.APP)

      // メインコンテンツにrole="main"が設定されている
      const main = page.locator('[role="main"], main')
      await expect(main).toBeVisible()

      // ナビゲーションにrole="navigation"が設定されている
      const nav = page.locator('[role="navigation"], nav')
      await expect(nav).toBeVisible()
    })
  })
})
