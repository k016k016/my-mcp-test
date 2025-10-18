// APPドメインE2Eテスト - E2E_TEST_APP_DOMAIN.md準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, loginAsMember } from './helpers'

// 同じユーザーで複数のテストを実行するため、シリアルモードで実行
// (Supabaseのセッション競合を回避)
test.describe.configure({ mode: 'serial' })

test.describe('APPドメイン - 一般ユーザー向けダッシュボード', () => {
  test.describe('1. ダッシュボード表示', () => {
    test('1-1. member権限ユーザーのダッシュボードアクセス', async ({ page }) => {
      // member@example.com でログイン
      await loginAsMember(page)

      // APPドメインに自動リダイレクト
      await expect(page).toHaveURL(/app\.local\.test:3000/, { timeout: 5000 })

      // APPドメインのダッシュボードが表示される
      await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible()

      // ウェルカムメッセージ「こんにちは、Member Userさん」が表示される
      await expect(page.locator('text=こんにちは、Member Userさん')).toBeVisible()

      // 所属組織名が表示される
      await expect(page.locator('text=あなたの組織')).toBeVisible()

      // ヘッダーにユーザーメニューが表示される
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('1-2. 未認証ユーザーのAPPドメインアクセス', async ({ page }) => {
      // ログアウト状態で直接APPドメインにアクセス
      await page.goto(DOMAINS.APP)

      // WWWログインページにリダイレクト
      await expect(page).toHaveURL(/www\.local\.test:3000\/login/, { timeout: 5000 })
    })
  })

  test.describe('2. プロフィール設定', () => {
    test('2-1. プロフィール情報の表示', async ({ page }) => {
      // ログイン
      await loginAsMember(page)

      // プロフィール設定ページに移動
      await page.goto(`${DOMAINS.APP}/settings/profile`, { waitUntil: 'networkidle' })

      // プロフィール設定ページが表示される
      await expect(page.locator('h1:has-text("プロフィール設定")')).toBeVisible()

      // 現在の名前が表示される
      await expect(page.locator('input[name="fullName"]')).toBeVisible()

      // 現在のメールアドレスが表示される
      await expect(page.locator('input[name="email"]')).toHaveValue('member@example.com')

      // パスワード変更フォームが表示される
      await expect(page.locator('text=パスワード変更')).toBeVisible()
    })

    test('2-2. プロフィール情報の更新（名前変更）', async ({ page }) => {
      // ログイン
      await loginAsMember(page)

      await page.goto(`${DOMAINS.APP}/settings/profile`, { waitUntil: 'networkidle' })

      // 元の名前を取得
      const originalName = await page.locator('input[name="fullName"]').inputValue()

      // 名前フィールドを変更
      await page.fill('input[name="fullName"]', 'Updated Member')

      // 保存ボタンをクリック
      await page.click('button[type="submit"]:has-text("保存")')

      // 成功メッセージが表示される（データベースに保存されたことを確認）
      // 並列実行時やFirefox/WebKitでは保存処理に時間がかかる場合がある
      await expect(page.locator('text=プロフィールを更新しました')).toBeVisible({
        timeout: 10000,
      })

      // テスト後、元の名前に戻す（データをクリーンアップ）
      await page.waitForTimeout(2000) // フォームが再び編集可能になるまで待つ（Firefox/WebKit対応）
      await page.locator('input[name="fullName"]').fill(originalName || 'Member User')
      await page.click('button[type="submit"]:has-text("保存")')
      await expect(page.locator('text=プロフィールを更新しました')).toBeVisible({
        timeout: 10000,
      })
    })

    test('2-3. パスワード変更', async ({ page }) => {
      // ログイン
      await loginAsMember(page)

      await page.goto(`${DOMAINS.APP}/settings/profile`, { waitUntil: 'networkidle' })

      // 新しいパスワードを入力
      await page.fill('input[name="newPassword"]', 'newpass123')
      await page.fill('input[name="confirmPassword"]', 'newpass123')

      // パスワード変更ボタンをクリック
      await page.click('button:has-text("パスワードを変更")')

      // 成功メッセージが表示される
      await expect(page.locator('text=パスワードを変更しました')).toBeVisible({
        timeout: 5000,
      })

      // テスト後、パスワードを元に戻す（後続のテストのため）
      await page.waitForTimeout(2000) // フォームが再び編集可能になるまで待つ
      await page.fill('input[name="newPassword"]', 'test1234')
      await page.fill('input[name="confirmPassword"]', 'test1234')
      await page.click('button:has-text("パスワードを変更")')
      await expect(page.locator('text=パスワードを変更しました')).toBeVisible({
        timeout: 5000,
      })
    })

    test('2-4. パスワード変更エラー（パスワード不一致）', async ({ page }) => {
      // ログイン
      await loginAsMember(page)

      await page.goto(`${DOMAINS.APP}/settings/profile`, { waitUntil: 'networkidle' })

      // 新しいパスワードと確認パスワードを異なる値で入力
      await page.fill('input[name="newPassword"]', 'newpass123')
      await page.fill('input[name="confirmPassword"]', 'differentpass')

      // パスワード変更ボタンをクリック
      await page.click('button:has-text("パスワードを変更")')

      // エラーメッセージが表示される
      await expect(
        page.locator('text=/新しいパスワードが一致しません|パスワードが一致しません/')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('3. 組織情報の閲覧', () => {
    test('3-1. 所属組織情報の表示', async ({ page }) => {
      // ログイン
      await loginAsMember(page)

      // 組織情報ページに移動
      await page.goto(`${DOMAINS.APP}/organization`, { waitUntil: 'networkidle' })

      // 組織情報ページが表示される
      await expect(page.locator('h1:has-text("組織情報")')).toBeVisible()

      // 組織名が表示される（実際の組織名は環境によって異なる）
      await expect(page.locator('text=組織名')).toBeVisible()

      // 現在のプランが表示される
      await expect(page.locator('text=プラン')).toBeVisible()

      // メンバー数が表示される
      await expect(page.locator('text=メンバー数')).toBeVisible()
    })

    test('3-2. member権限ユーザーが編集不可であることを確認', async ({ page }) => {
      // ログイン
      await loginAsMember(page)

      // 組織情報ページに移動
      await page.goto(`${DOMAINS.APP}/organization`, { waitUntil: 'networkidle' })

      // 編集不可のメッセージが表示される
      await expect(
        page.locator('text=/組織情報の編集は管理者のみ|編集は管理者のみ可能/')
      ).toBeVisible()

      // または、編集ボタンが存在しない（member権限のため）
      // 管理画面へのリンクは表示されない
      const editButton = page.locator('button:has-text("編集")')
      await expect(editButton).not.toBeVisible()
    })
  })
})
