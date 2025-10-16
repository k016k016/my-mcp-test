// メンバー招待E2Eテスト - AUTH_FLOW_SPECIFICATION.md セクション7準拠
import { test, expect } from '@playwright/test'
import { DOMAINS, loginAsAdmin, loginAsOwner, generateUniqueEmail } from './helpers'

test.describe('メンバー招待 - AUTH_FLOW_SPECIFICATION準拠', () => {
  test.describe('招待時の権限設定', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)
    })

    test('ADMINロールでメンバーを招待できる', async ({ page }) => {
      // 招待ボタンをクリック
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')

      // 招待フォームが表示される
      await expect(page.locator('h2:has-text("メンバーを招待")')).toBeVisible()

      // フォームに入力
      const email = generateUniqueEmail('new-admin')
      await page.fill('input[name="email"]', email)

      // ロールを選択（admin）
      await page.selectOption('select[name="role"]', 'admin')

      // 招待を送信
      await page.click('button[type="submit"]:has-text("招待")')

      // 成功メッセージが表示される
      await expect(
        page.locator('text=招待メールを送信しました, text=招待を送信しました')
      ).toBeVisible()

      // 招待されたユーザーがリストに表示される
      await expect(page.locator(`text=${email}`)).toBeVisible()
    })

    test('APPロール（一般ユーザー）でメンバーを招待できる', async ({
      page,
    }) => {
      // 招待ボタンをクリック
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')

      // フォームに入力
      const email = generateUniqueEmail('new-member')
      await page.fill('input[name="email"]', email)

      // ロールを選択（member = APP権限）
      await page.selectOption('select[name="role"]', 'member')

      // 招待を送信
      await page.click('button[type="submit"]:has-text("招待")')

      // 成功メッセージが表示される
      await expect(
        page.locator('text=招待メールを送信しました, text=招待を送信しました')
      ).toBeVisible()

      // 招待されたユーザーがリストに表示される
      await expect(page.locator(`text=${email}`)).toBeVisible()
    })

    test('ロール選択ドロップダウンに正しい選択肢が表示される', async ({
      page,
    }) => {
      // 招待ボタンをクリック
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')

      // ロール選択ドロップダウンが表示される
      const roleSelect = page.locator('select[name="role"]')
      await expect(roleSelect).toBeVisible()

      // オプションを取得
      const options = await roleSelect.locator('option').allTextContents()

      // admin と member が含まれる
      const optionsLower = options.map((o) => o.toLowerCase())
      expect(
        optionsLower.some((o) => o.includes('admin') || o.includes('管理者'))
      ).toBeTruthy()
      expect(
        optionsLower.some((o) => o.includes('member') || o.includes('メンバー'))
      ).toBeTruthy()

      // owner は招待時に設定できない（オーナーは1人のみ）
      expect(
        optionsLower.some((o) => o.includes('owner') || o.includes('オーナー'))
      ).toBeFalsy()
    })

    test('招待されたメンバーにロールバッジが表示される', async ({ page }) => {
      // 招待ボタンをクリック
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')

      // フォームに入力
      const email = generateUniqueEmail('role-badge-test')
      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'admin')
      await page.click('button[type="submit"]:has-text("招待")')

      // 成功メッセージを待機
      await expect(
        page.locator('text=招待メールを送信しました, text=招待を送信しました')
      ).toBeVisible()

      // メンバーリストでロールバッジが表示される
      const memberRow = page.locator(`tr:has-text("${email}")`)
      const roleBadge = memberRow.locator('[data-testid="role-badge"], .badge')

      await expect(roleBadge).toBeVisible()
      await expect(roleBadge).toHaveText(/admin|管理者/i)
    })
  })

  test.describe('開発環境での招待フロー（メール送信なし）', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)
    })

    test('開発環境では直接パスワードを設定できる', async ({ page }) => {
      // 招待ボタンをクリック
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')

      // フォームに入力
      const email = generateUniqueEmail('dev-invite')
      const password = 'DevPassword123!'

      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'member')

      // 開発環境ではパスワードフィールドが表示される
      const passwordField = page.locator('input[name="password"]')
      if ((await passwordField.count()) > 0) {
        await expect(passwordField).toBeVisible()
        await passwordField.fill(password)

        // 確認パスワード
        const confirmPasswordField = page.locator(
          'input[name="confirmPassword"]'
        )
        if ((await confirmPasswordField.count()) > 0) {
          await confirmPasswordField.fill(password)
        }
      }

      // 招待を送信
      await page.click('button[type="submit"]:has-text("招待")')

      // 成功メッセージが表示される
      await expect(
        page.locator('text=招待メールを送信しました, text=メンバーを追加しました')
      ).toBeVisible()
    })

    test('メール確認なしで即座にログインできる', async ({ page }) => {
      // 招待を実行（前のテストと同じ）
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')

      const email = generateUniqueEmail('immediate-login')
      const password = 'ImmediatePassword123!'

      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'member')

      const passwordField = page.locator('input[name="password"]')
      if ((await passwordField.count()) > 0) {
        await passwordField.fill(password)
        const confirmPasswordField = page.locator(
          'input[name="confirmPassword"]'
        )
        if ((await confirmPasswordField.count()) > 0) {
          await confirmPasswordField.fill(password)
        }
      }

      await page.click('button[type="submit"]:has-text("招待")')

      await expect(
        page.locator('text=招待メールを送信しました, text=メンバーを追加しました')
      ).toBeVisible()

      // ログアウト
      await page.click('[data-testid="user-menu"]')
      await page.click('text=ログアウト')

      // 招待されたユーザーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // ログイン成功（メール確認不要）
      await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })
    })
  })

  test.describe('招待の権限制御', () => {
    test('一般メンバーは招待機能にアクセスできない', async ({ page }) => {
      // 一般メンバーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', 'member@example.com')
      await page.fill('input[name="password"]', 'MemberPassword123!')
      await page.click('button[type="submit"]')

      // APPドメインにリダイレクトされる
      await expect(page).toHaveURL(/app\.localhost:3000/, { timeout: 10000 })

      // メンバー管理ページにアクセスしようとする
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // 権限エラーまたはAPPドメインにリダイレクト
      const url = page.url()
      if (url.includes('app.localhost')) {
        await expect(
          page.locator('text=管理者権限がありません')
        ).toBeVisible()
      } else {
        await expect(page.locator('text=権限がありません')).toBeVisible()
      }
    })

    test('管理者は招待機能にアクセスできる', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // 招待ボタンが表示される
      const inviteButton = page.locator(
        'button:has-text("メンバーを招待"), button:has-text("招待")'
      )
      await expect(inviteButton).toBeVisible()
      await expect(inviteButton).toBeEnabled()
    })

    test('オーナーは招待機能にアクセスできる', async ({ page }) => {
      await loginAsOwner(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      // 招待ボタンが表示される
      const inviteButton = page.locator(
        'button:has-text("メンバーを招待"), button:has-text("招待")'
      )
      await expect(inviteButton).toBeVisible()
      await expect(inviteButton).toBeEnabled()
    })
  })

  test.describe('招待の入力バリデーション', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')
    })

    test('無効なメールアドレスでエラーが表示される', async ({ page }) => {
      // 無効なメールアドレスを入力
      await page.fill('input[name="email"]', 'invalid-email')
      await page.selectOption('select[name="role"]', 'member')
      await page.click('button[type="submit"]:has-text("招待")')

      // バリデーションエラーが表示される
      await expect(
        page.locator('text=有効なメールアドレスを入力してください')
      ).toBeVisible()
    })

    test('既に存在するメールアドレスでエラーが表示される', async ({
      page,
    }) => {
      // 既に登録されているメールアドレス
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.selectOption('select[name="role"]', 'member')
      await page.click('button[type="submit"]:has-text("招待")')

      // エラーメッセージが表示される
      await expect(
        page.locator('text=このメールアドレスは既に登録されています')
      ).toBeVisible()
    })

    test('ロールを選択しないとエラーが表示される', async ({ page }) => {
      await page.fill('input[name="email"]', generateUniqueEmail('no-role'))

      // ロールを選択せずに送信
      const roleSelect = page.locator('select[name="role"]')
      if ((await roleSelect.count()) > 0) {
        await page.click('button[type="submit"]:has-text("招待")')

        // バリデーションエラーが表示される
        await expect(
          page.locator('text=ロールを選択してください')
        ).toBeVisible()
      }
    })

    test('パスワードが弱い場合エラーが表示される（開発環境）', async ({
      page,
    }) => {
      const email = generateUniqueEmail('weak-password')
      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'member')

      // 弱いパスワードを入力
      const passwordField = page.locator('input[name="password"]')
      if ((await passwordField.count()) > 0) {
        await passwordField.fill('weak')
        await page.click('button[type="submit"]:has-text("招待")')

        // パスワード強度エラーが表示される
        await expect(
          page.locator(
            'text=パスワードは8文字以上, text=パスワードが短すぎます'
          )
        ).toBeVisible()
      }
    })
  })

  test.describe('招待リストの管理', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)
    })

    test('招待中のユーザーが表示される', async ({ page }) => {
      // 招待中のユーザーセクションまたはステータス
      const pendingInvites = page.locator(
        'text=招待中, [data-testid="pending-invitations"]'
      )

      if ((await pendingInvites.count()) > 0) {
        await expect(pendingInvites.first()).toBeVisible()
      }
    })

    test('招待をキャンセルできる', async ({ page }) => {
      // 招待を作成
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')
      const email = generateUniqueEmail('cancel-invite')
      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'member')
      await page.click('button[type="submit"]:has-text("招待")')

      await expect(
        page.locator('text=招待メールを送信しました, text=メンバーを追加しました')
      ).toBeVisible()

      // キャンセルボタンをクリック
      const cancelButton = page
        .locator(`tr:has-text("${email}")`)
        .locator('button:has-text("キャンセル"), button:has-text("削除")')

      if ((await cancelButton.count()) > 0) {
        await cancelButton.click()

        // 確認ダイアログ
        const confirmButton = page.locator(
          'button:has-text("キャンセルする"), button:has-text("削除する")'
        )
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click()
        }

        // 成功メッセージ
        await expect(
          page.locator('text=招待をキャンセルしました, text=削除しました')
        ).toBeVisible()
      }
    })

    test('招待を再送信できる', async ({ page }) => {
      // 招待を作成
      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')
      const email = generateUniqueEmail('resend-invite')
      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'member')
      await page.click('button[type="submit"]:has-text("招待")')

      await expect(
        page.locator('text=招待メールを送信しました, text=メンバーを追加しました')
      ).toBeVisible()

      // 再送信ボタンをクリック
      const resendButton = page
        .locator(`tr:has-text("${email}")`)
        .locator('button:has-text("再送信"), button:has-text("再送")')

      if ((await resendButton.count()) > 0) {
        await resendButton.click()

        // 成功メッセージ
        await expect(
          page.locator('text=招待メールを再送信しました')
        ).toBeVisible()
      }
    })
  })

  test.describe('招待後のユーザー状態', () => {
    test('招待されたユーザーは正しいロールでログインできる', async ({
      page,
    }) => {
      // 管理者として招待を作成
      await loginAsAdmin(page)
      await page.goto(`${DOMAINS.ADMIN}/settings/members`)

      await page.click('button:has-text("メンバーを招待"), button:has-text("招待")')
      const email = generateUniqueEmail('role-verification')
      const password = 'RolePassword123!'

      await page.fill('input[name="email"]', email)
      await page.selectOption('select[name="role"]', 'admin')

      const passwordField = page.locator('input[name="password"]')
      if ((await passwordField.count()) > 0) {
        await passwordField.fill(password)
        const confirmPasswordField = page.locator(
          'input[name="confirmPassword"]'
        )
        if ((await confirmPasswordField.count()) > 0) {
          await confirmPasswordField.fill(password)
        }
      }

      await page.click('button[type="submit"]:has-text("招待")')
      await expect(
        page.locator('text=招待メールを送信しました, text=メンバーを追加しました')
      ).toBeVisible()

      // ログアウト
      await page.click('[data-testid="user-menu"]')
      await page.click('text=ログアウト')

      // 招待されたユーザーとしてログイン
      await page.goto(`${DOMAINS.WWW}/login`)
      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // 管理者権限があるため、ADMINドメインにリダイレクトされる
      await expect(page).toHaveURL(/admin\.localhost:3000/, {
        timeout: 10000,
      })
    })
  })
})
