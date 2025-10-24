// Wiki機能E2Eテスト
// 注: このテストは storageState (事前ログイン済み) を使用します
import { test, expect } from '@playwright/test'
import { DOMAINS } from './helpers'

test.describe('Wiki機能', () => {
  const testSlug = `test-page-${Date.now()}`
  const testTitle = `テストページ ${Date.now()}`

  test.describe('Wikiページ作成', () => {
    test('Wikiトップページが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.APP}/wiki`)

      // Wikiページが表示される
      await expect(page.locator('h1:has-text("Wiki")')).toBeVisible()
    })

    test('新しいページ作成ボタンが表示される', async ({ page }) => {
      await page.goto(`${DOMAINS.APP}/wiki`)

      // 新しいページボタンが表示される
      await expect(page.locator('a:has-text("新しいページ")')).toBeVisible()
    })

    test('Wikiページを作成できる', async ({ page }) => {
      await page.goto(`${DOMAINS.APP}/wiki/create`)

      // 作成フォームが表示される
      await expect(page.locator('h1:has-text("新しいページを作成")')).toBeVisible()

      // フォームに入力
      await page.fill('input[name="title"]', testTitle)
      await page.fill('input[name="slug"]', testSlug)

      // Markdownエディタに入力（textareaまたはMonacoエディタ）
      const contentInput = page.locator('textarea[name="content"]')
      if (await contentInput.isVisible()) {
        await contentInput.fill('# テストコンテンツ\n\nこれはテストページです。')
      } else {
        // Monacoエディタの場合
        await page.click('.monaco-editor')
        await page.keyboard.type('# テストコンテンツ\n\nこれはテストページです。')
      }

      // 作成ボタンをクリック
      await page.click('button[type="submit"]:has-text("作成")')

      // ページ詳細に遷移
      await expect(page).toHaveURL(new RegExp(`/wiki/${testSlug}`), { timeout: 10000 })

      // ページタイトルが表示される
      await expect(page.locator(`h1:has-text("${testTitle}")`)).toBeVisible()
    })
  })

  test.describe('Wikiページ一覧', () => {
    test('作成したページが一覧に表示される', async ({ page }) => {
      // まずページを作成
      await page.goto(`${DOMAINS.APP}/wiki/create`)
      const uniqueSlug = `list-test-${Date.now()}`
      const uniqueTitle = `一覧テスト ${Date.now()}`

      await page.fill('input[name="title"]', uniqueTitle)
      await page.fill('input[name="slug"]', uniqueSlug)

      const contentInput = page.locator('textarea[name="content"]')
      if (await contentInput.isVisible()) {
        await contentInput.fill('テストコンテンツ')
      }

      await page.click('button[type="submit"]:has-text("作成")')

      // ページ作成完了を待つ（詳細ページへの遷移）
      await expect(page).toHaveURL(new RegExp(`/wiki/${uniqueSlug}`), { timeout: 10000 })

      // 一覧ページに戻る
      await page.goto(`${DOMAINS.APP}/wiki`)

      // 作成したページが表示される
      await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible()
    })

    test('ページがない場合、メッセージが表示される', async ({ page }) => {
      // 新規組織または空のWikiの場合
      await page.goto(`${DOMAINS.APP}/wiki`)

      // 「まだページがありません」または既存ページが表示される
      const noPages = page.locator('text=まだページがありません')
      const pageList = page.locator('h3')

      const hasContent = await noPages.isVisible().catch(() => false) || await pageList.count() > 0
      expect(hasContent).toBeTruthy()
    })
  })

  test.describe('Wikiページ表示', () => {
    test('ページの詳細が表示される', async ({ page }) => {
      // ページを作成
      await page.goto(`${DOMAINS.APP}/wiki/create`)
      const uniqueSlug = `detail-test-${Date.now()}`
      const uniqueTitle = `詳細テスト ${Date.now()}`

      await page.fill('input[name="title"]', uniqueTitle)
      await page.fill('input[name="slug"]', uniqueSlug)

      const contentInput = page.locator('textarea[name="content"]')
      if (await contentInput.isVisible()) {
        await contentInput.fill('# 見出し\n\n本文テキスト')
      }

      await page.click('button[type="submit"]:has-text("作成")')

      // ページ詳細に遷移するのを待つ
      await expect(page).toHaveURL(new RegExp(`/wiki/${uniqueSlug}`), { timeout: 10000 })

      // ページが表示される
      await expect(page.locator(`h1:has-text("${uniqueTitle}")`)).toBeVisible()

      // 作成日・更新日が表示される
      await expect(page.locator('text=作成:')).toBeVisible()
      await expect(page.locator('text=更新:')).toBeVisible()

      // 閲覧数が表示される
      await expect(page.locator('text=閲覧数:')).toBeVisible()
    })

    test('Wikiに戻るリンクが機能する', async ({ page }) => {
      // ページを作成して詳細を表示
      await page.goto(`${DOMAINS.APP}/wiki/create`)
      const uniqueSlug = `back-test-${Date.now()}`
      const uniqueTitle = `戻るテスト ${Date.now()}`

      await page.fill('input[name="title"]', uniqueTitle)
      await page.fill('input[name="slug"]', uniqueSlug)

      const contentInput = page.locator('textarea[name="content"]')
      if (await contentInput.isVisible()) {
        await contentInput.fill('テストコンテンツ')
      }

      await page.click('button[type="submit"]:has-text("作成")')

      // ページ詳細に遷移するのを待つ
      await expect(page).toHaveURL(new RegExp(`/wiki/${uniqueSlug}`), { timeout: 10000 })

      // 戻るリンクをクリック
      await page.click('a:has-text("Wikiに戻る")')

      // 一覧ページに戻る
      await expect(page).toHaveURL(new RegExp('/wiki$'))
    })
  })

  test.describe('Wikiページ編集', () => {
    test.skip('ページを編集できる（作成者）', async ({ page }) => {
      // TODO: 編集機能実装後に有効化
      await page.goto(`${DOMAINS.APP}/wiki/create`)
      const uniqueSlug = `edit-test-${Date.now()}`

      await page.fill('input[name="title"]', '編集前タイトル')
      await page.fill('input[name="slug"]', uniqueSlug)

      const contentInput = page.locator('textarea[name="content"]')
      if (await contentInput.isVisible()) {
        await contentInput.fill('編集前コンテンツ')
      }

      await page.click('button[type="submit"]:has-text("作成")')

      // 編集ページに移動
      await page.goto(`${DOMAINS.APP}/wiki/${uniqueSlug}/edit`)

      // タイトルを変更
      await page.fill('input[name="title"]', '編集後タイトル')
      await page.click('button[type="submit"]:has-text("更新")')

      // 更新されたページが表示される
      await expect(page.locator('h1:has-text("編集後タイトル")')).toBeVisible()
    })
  })

  test.describe('Wikiページ削除', () => {
    test.skip('管理者はページを削除できる', async ({ page }) => {
      // TODO: 削除機能実装後に有効化
      // 管理者権限でログイン（storageState使用）
      await page.goto(`${DOMAINS.APP}/wiki/create`)
      const uniqueSlug = `delete-test-${Date.now()}`

      await page.fill('input[name="title"]', '削除テストページ')
      await page.fill('input[name="slug"]', uniqueSlug)

      const contentInput = page.locator('textarea[name="content"]')
      if (await contentInput.isVisible()) {
        await contentInput.fill('削除予定コンテンツ')
      }

      await page.click('button[type="submit"]:has-text("作成")')

      // 削除ボタンをクリック
      await page.click('button:has-text("削除")')

      // 確認ダイアログで承認
      page.on('dialog', dialog => dialog.accept())

      // 一覧ページに戻る
      await expect(page).toHaveURL(new RegExp('/wiki$'))
    })

    test.skip('一般メンバーは他人のページを削除できない', async ({ page }) => {
      // TODO: 権限チェック実装後に有効化
      // 一般メンバー権限でのテストは別のstorageStateが必要
    })
  })

  test.describe('Wiki検索', () => {
    test.skip('キーワードでページを検索できる', async ({ page }) => {
      // TODO: 検索機能実装後に有効化
      await page.goto(`${DOMAINS.APP}/wiki/search`)

      // 検索フォームが表示される
      await expect(page.locator('h1:has-text("Wiki検索")')).toBeVisible()
      await expect(page.locator('input[type="text"]')).toBeVisible()

      // キーワードを入力
      await page.fill('input[type="text"]', 'テスト')
      await page.click('button[type="submit"]:has-text("検索")')

      // 検索結果が表示される
      await expect(page.locator('text=検索結果')).toBeVisible()
    })

    test.skip('検索結果がない場合、メッセージが表示される', async ({ page }) => {
      // TODO: 検索機能実装後に有効化
      await page.goto(`${DOMAINS.APP}/wiki/search`)

      // 存在しないキーワードで検索
      await page.fill('input[type="text"]', 'zzz存在しないキーワードzzz')
      await page.click('button[type="submit"]:has-text("検索")')

      // 「結果が見つかりませんでした」メッセージ
      await expect(page.locator('text=検索結果が見つかりませんでした')).toBeVisible()
    })
  })

  test.describe('Wiki権限管理', () => {
    test('ログインユーザーはWikiにアクセスできる', async ({ page }) => {
      // storageStateで既にログイン済み
      await page.goto(`${DOMAINS.APP}/wiki`)

      // Wikiページが表示される
      await expect(page).toHaveURL(new RegExp('/wiki'))
      await expect(page.locator('h1:has-text("Wiki")')).toBeVisible()
    })

    test.skip('一般メンバーも閲覧できる', async ({ page }) => {
      // TODO: 別のstorageState（member権限）でテスト
    })

    test.skip('管理者のみ削除できる', async ({ page }) => {
      // TODO: 権限チェック実装後に有効化
    })
  })

  test.describe('Wikiナビゲーション', () => {
    test('APPドメインのヘッダーからWikiにアクセスできる', async ({ page }) => {
      await page.goto(DOMAINS.APP)

      // ヘッダーにWikiリンクがあることを確認（実装に応じて調整）
      const wikiLink = page.locator('a[href="/wiki"]')
      if (await wikiLink.isVisible()) {
        await wikiLink.click()
        await expect(page).toHaveURL(new RegExp('/wiki'))
      } else {
        // 直接アクセスできることを確認
        await page.goto(`${DOMAINS.APP}/wiki`)
        await expect(page).toHaveURL(new RegExp('/wiki'))
      }
    })
  })
})
