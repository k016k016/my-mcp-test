# E2Eテストのベストプラクティス

このドキュメントでは、組織切り替えE2Eテストの修正で学んだ、非同期処理とローディング表示のテストパターンを記録します。

## 目次

1. [背景と問題](#背景と問題)
2. [Cookie-based E2E遅延制御](#cookie-based-e2e遅延制御)
3. [uiBusy状態管理パターン](#uibusy状態管理パターン)
4. [UI変化待機パターン](#ui変化待機パターン)
5. [並行検証パターン](#並行検証パターン)
6. [適用シーン別サンプル](#適用シーン別サンプル)
7. [トラブルシューティング](#トラブルシューティング)

---

## 背景と問題

### 発生した問題

組織切り替え時のローディングインジケーターがE2Eテストで検出できない問題が発生しました。

**症状**:
```
Error: expect(received).toBeAttached()
Timed out 2000ms waiting for element(s) to be attached
```

**根本原因**:
1. Next.js Server Actionsが即座に完了してリダイレクト
2. `useTransition`の`isPending`がtrueになる前に画面遷移
3. ローダーDOMが一度も生成されない

### 学んだ重要な教訓

1. **UIフラグは非同期処理の前に立てる** - 後から立てると遅すぎる
2. **Cookie > localStorage** - サブドメイン間でデータを共有できる
3. **UI変化 + データ変化** - 両方を待機することで確実に検証
4. **最小表示時間** - フラッシュ防止とテスト安定化

---

## Cookie-based E2E遅延制御

### パターン概要

E2E環境でのみ人工的な遅延を入れ、ローディング表示を確実にテストできるようにします。

### 実装（Playwright）

```typescript
/**
 * E2E環境でローディングインジケーター表示を確実にするための遅延フラグを設定
 *
 * @param page - Playwrightのページオブジェクト
 * @param delayMs - 遅延時間（ミリ秒）
 */
export async function setE2EFlag(page: Page, delayMs = 700) {
  await page.context().addCookies([
    {
      name: '__E2E_FORCE_PENDING_MS__',
      value: String(delayMs),
      domain: '.local.test',  // 全サブドメインで有効
      path: '/',
      sameSite: 'Lax',
    },
  ])
}
```

### コンポーネント側の実装

```typescript
async function handleAction() {
  // E2E環境での人工遅延
  let e2eDelayMs = 0
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const cookieMatch = document.cookie.match(/__E2E_FORCE_PENDING_MS__=(\d+)/)
    if (cookieMatch) {
      e2eDelayMs = Number(cookieMatch[1])
      console.log('[E2E] forced delay', e2eDelayMs, 'ms')

      // UIビジー状態をON（後述のuiBusyパターン参照）
      setUiBusy(true)
      await new Promise(r => setTimeout(r, e2eDelayMs))

      // Cookie削除（1回使い切り）
      document.cookie = '__E2E_FORCE_PENDING_MS__=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.local.test'
    }
  }

  const result = await someAsyncAction()

  // 最小表示時間を保証（フラッシュ防止）
  if (e2eDelayMs > 0) {
    await new Promise(r => setTimeout(r, 300))
  }

  setUiBusy(false)
}
```

### 使用例（Playwrightテスト）

```typescript
test('ローディングが表示される', async ({ page }) => {
  await loginAsUser(page)

  // E2E遅延フラグをセット（700ms）
  await setE2EFlag(page, 700)

  await page.getByTestId('submit-button').click()

  const loader = page.getByTestId('loading-indicator')

  // ローダーのライフサイクル全体を検証
  await expect(loader).toBeAttached({ timeout: 2000 })
  await expect(loader).toBeVisible({ timeout: 2000 })
  await expect(loader).toBeHidden({ timeout: 10000 })
})
```

### なぜCookieなのか？

| 方式 | メリット | デメリット |
|-----|---------|-----------|
| **Cookie** | サブドメイン間で共有可能、ページ遷移後も有効 | サイズ制限（4KB） |
| localStorage | 大容量データ保存可能 | オリジン単位で分離、クロスドメイン不可 |
| sessionStorage | タブ単位で管理 | オリジン単位、ページ遷移で消える |
| API route delay | サーバーサイドで制御 | Server Actionsでは使えない |

**結論**: マルチドメイン・ページ遷移が絡む場合は**Cookie一択**。

---

## uiBusy状態管理パターン

### パターン概要

`useTransition`の`isPending`だけでなく、独自の`uiBusy`状態を持つことで、非同期処理**前**にUIフラグを立てます。

### 問題：isPending単独の場合

```typescript
// ❌ 問題あるパターン
const [isPending, startTransition] = useTransition()

async function handleAction() {
  const result = await someAsyncAction()  // 即座に完了してリダイレクト
  // ↑ isPendingがtrueになる前にリダイレクトされる
}

// isPendingだけだとローダーDOMが生成されない
{isPending && <LoadingIndicator />}
```

### 解決：uiBusy状態の追加

```typescript
// ✅ 正しいパターン
const [isPending, startTransition] = useTransition()
const [uiBusy, setUiBusy] = useState(false)

async function handleAction() {
  setUiBusy(true)  // ← 非同期処理の前に設定

  const result = await someAsyncAction()

  setUiBusy(false)
}

// OR条件でどちらかがtrueならローダー表示
{(isPending || uiBusy) && <LoadingIndicator />}
```

### React以外での実装

#### Vue 3 Composition API

```vue
<script setup lang="ts">
import { ref } from 'vue'

const uiBusy = ref(false)

async function handleAction() {
  uiBusy.value = true

  await someAsyncAction()

  uiBusy.value = false
}
</script>

<template>
  <div v-if="uiBusy" class="loading-indicator">
    Loading...
  </div>
</template>
```

#### Angular

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-action-button',
  template: `
    <div *ngIf="uiBusy" class="loading-indicator">
      Loading...
    </div>
  `
})
export class ActionButtonComponent {
  uiBusy = false;

  async handleAction() {
    this.uiBusy = true;

    await this.someAsyncAction();

    this.uiBusy = false;
  }
}
```

#### Vanilla JavaScript

```javascript
let uiBusy = false

async function handleAction() {
  uiBusy = true
  updateUI()

  await someAsyncAction()

  uiBusy = false
  updateUI()
}

function updateUI() {
  const loader = document.getElementById('loader')
  loader.style.display = uiBusy ? 'block' : 'none'
}
```

### ボタンのdisabled制御

```typescript
// ✅ 両方の状態でボタンを無効化
<button disabled={isPending || uiBusy} onClick={handleAction}>
  送信
</button>
```

---

## UI変化待機パターン

### パターン概要

Cookie値やデータの変化だけでなく、**UI（画面表示）の変化も待機**することで、確実に検証します。

### 問題：Cookie値のみ待機

```typescript
// ❌ 問題あるパターン
test('Cookie更新テスト', async ({ page }) => {
  const initialCookie = await getCookie(page, 'current_organization_id')

  await switchOrganization(page)

  // リダイレクト直後だとまだ更新されていないことがある
  const updatedCookie = await getCookie(page, 'current_organization_id')

  expect(updatedCookie).not.toBe(initialCookie)  // 失敗することがある
})
```

### 解決：UI変化も待機

```typescript
// ✅ 正しいパターン
test('Cookie更新テスト', async ({ page }) => {
  const initialCookie = await getCookie(page, 'current_organization_id')

  // 初期表示されている値を取得
  const currentName = page.getByTestId('organization-name')
  const initialName = (await currentName.textContent())?.trim() ?? ''

  await switchOrganization(page)

  // UI（組織名）が変わるまで待機
  await expect(currentName).not.toHaveText(initialName, { timeout: 5000 })

  // UIが変わった後ならCookieも確実に更新されている
  const updatedCookie = await getCookie(page, 'current_organization_id')
  expect(updatedCookie).not.toBe(initialCookie)
})
```

### 適用シーン

| シーン | 初期値 | 待機するUI変化 |
|--------|--------|---------------|
| データ更新 | ユーザー名 | テキスト内容の変化 |
| リスト追加 | アイテム数 | リストの要素数増加 |
| ステータス変更 | ステータスバッジ | クラス名またはテキスト変化 |
| ページ遷移 | URL | URLパターンの変化 |

### パフォーマンス最適化

```typescript
// クリックとURL待機を並行実行（Navigation interrupted防止）
await Promise.all([
  page.waitForURL(/new-page/, { timeout: 10000 }),
  page.getByTestId('submit-button').click(),
])
```

---

## 並行検証パターン

### パターン概要

`Promise.all`でクリックとアサーションを並行実行し、ローダーのライフサイクル全体を検証します。

### 実装

```typescript
test('ローディング表示のライフサイクル', async ({ page }) => {
  await page.getByTestId('submit-button').click()

  const loader = page.getByTestId('loading-indicator')

  // クリックと並行して検証
  await Promise.all([
    (async () => {
      // 1. DOMにアタッチされる
      await expect(loader).toBeAttached({ timeout: 2000 })

      // 2. 可視化される
      await expect(loader).toBeVisible({ timeout: 2000 })

      // 3. 非表示になる
      await expect(loader).toBeHidden({ timeout: 10000 })
    })(),
    button.click(),
  ])
})
```

### なぜ並行実行が必要か？

```typescript
// ❌ 逐次実行だと遅すぎる
await button.click()
await expect(loader).toBeAttached()  // 既に消えている可能性

// ✅ 並行実行で確実にキャッチ
await Promise.all([
  (async () => {
    await expect(loader).toBeAttached()  // クリックと同時に検証開始
  })(),
  button.click(),
])
```

### アニメーション/トランジションのテスト

```typescript
test('フェードイン・アウトアニメーション', async ({ page }) => {
  const modal = page.getByTestId('modal')

  await Promise.all([
    (async () => {
      // opacity: 0 → 1 → 0 を検証
      await expect(modal).toBeVisible()
      await expect(modal).toHaveCSS('opacity', '1', { timeout: 1000 })
      // アニメーション完了を待つ
      await page.waitForTimeout(500)
      await expect(modal).toHaveCSS('opacity', '0', { timeout: 1000 })
    })(),
    page.getByTestId('open-modal').click(),
  ])
})
```

---

## 適用シーン別サンプル

### 1. フォーム送信

```typescript
// コンポーネント
const [uiBusy, setUiBusy] = useState(false)

async function handleSubmit(e: FormEvent) {
  e.preventDefault()

  setUiBusy(true)

  // E2E遅延
  const e2eDelay = getE2ECookie()
  if (e2eDelay) await delay(e2eDelay)

  const result = await submitForm(formData)

  if (e2eDelay) await delay(300)  // 最小表示時間
  setUiBusy(false)

  if (result.success) {
    router.push('/success')
  }
}
```

```typescript
// テスト
test('フォーム送信時のローディング', async ({ page }) => {
  await setE2EFlag(page, 700)

  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')

  const loader = page.getByTestId('form-loading')

  await Promise.all([
    (async () => {
      await expect(loader).toBeVisible()
      await expect(loader).toBeHidden({ timeout: 10000 })
    })(),
    page.getByRole('button', { name: '送信' }).click(),
  ])
})
```

### 2. ファイルアップロード

```typescript
// コンポーネント
const [uiBusy, setUiBusy] = useState(false)
const [progress, setProgress] = useState(0)

async function handleUpload(file: File) {
  setUiBusy(true)

  const e2eDelay = getE2ECookie()
  if (e2eDelay) await delay(e2eDelay)

  const result = await uploadFile(file, (p) => setProgress(p))

  if (e2eDelay) await delay(300)
  setUiBusy(false)

  return result
}
```

```typescript
// テスト
test('ファイルアップロード進捗', async ({ page }) => {
  await setE2EFlag(page, 1000)

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('./test-file.pdf')

  const progressBar = page.getByTestId('upload-progress')

  await Promise.all([
    (async () => {
      await expect(progressBar).toBeVisible()
      // 進捗が増加することを確認
      await expect(progressBar).toHaveAttribute('value', /[1-9]/, { timeout: 5000 })
      await expect(progressBar).toBeHidden({ timeout: 15000 })
    })(),
    page.getByTestId('upload-button').click(),
  ])
})
```

### 3. ページ遷移

```typescript
// コンポーネント
const [uiBusy, setUiBusy] = useState(false)

async function handleNavigate() {
  setUiBusy(true)

  const e2eDelay = getE2ECookie()
  if (e2eDelay) await delay(e2eDelay)

  // データ取得などの前処理
  const data = await fetchData()

  if (e2eDelay) await delay(300)
  setUiBusy(false)

  window.location.href = `/page?data=${data.id}`
}
```

```typescript
// テスト
test('ページ遷移時のローディング', async ({ page }) => {
  await setE2EFlag(page, 700)

  const loader = page.getByTestId('page-loading')

  await Promise.all([
    page.waitForURL(/\/page\?data=/, { timeout: 10000 }),
    (async () => {
      await expect(loader).toBeVisible()
      await expect(loader).toBeHidden({ timeout: 10000 })
    })(),
    page.getByTestId('navigate-button').click(),
  ])
})
```

### 4. リアルタイム更新（WebSocket/SSE）

```typescript
// コンポーネント
const [uiBusy, setUiBusy] = useState(false)

useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000')

  ws.onmessage = async (event) => {
    setUiBusy(true)

    const e2eDelay = getE2ECookie()
    if (e2eDelay) await delay(e2eDelay)

    const data = JSON.parse(event.data)
    updateData(data)

    if (e2eDelay) await delay(300)
    setUiBusy(false)
  }

  return () => ws.close()
}, [])
```

```typescript
// テスト
test('リアルタイム更新のローディング', async ({ page }) => {
  await setE2EFlag(page, 700)

  await page.goto('/realtime-page')

  const loader = page.getByTestId('update-loading')
  const dataDisplay = page.getByTestId('data-display')

  // サーバーからメッセージを送信（別プロセス）
  await sendWebSocketMessage({ type: 'update', value: 'new-value' })

  // ローダーとデータ更新を検証
  await expect(loader).toBeVisible({ timeout: 2000 })
  await expect(dataDisplay).toHaveText('new-value', { timeout: 5000 })
  await expect(loader).toBeHidden({ timeout: 10000 })
})
```

---

## トラブルシューティング

### よくある失敗パターン

#### 1. ローダーが検出できない

**症状**:
```
Error: Timed out 2000ms waiting for element(s) to be attached
```

**原因**:
- UIフラグが非同期処理後に設定されている
- DOMが生成される前にリダイレクトされた

**解決**:
```typescript
// ❌ 悪い例
async function handleAction() {
  const result = await action()  // 先に実行
  setUiBusy(true)  // 遅すぎる
}

// ✅ 良い例
async function handleAction() {
  setUiBusy(true)  // 先に設定
  const result = await action()
}
```

#### 2. Cookieが反映されない

**症状**:
- Cookie設定しても遅延が効かない
- サブドメイン間でCookieが共有されない

**原因**:
- Domain属性が間違っている
- SameSite属性の問題

**解決**:
```typescript
// ❌ 悪い例
domain: 'local.test'  // ドット無し → サブドメインで無効

// ✅ 良い例
domain: '.local.test'  // ドット有り → サブドメイン間で共有
```

#### 3. テストがフレーキー（不安定）

**症状**:
- 時々成功、時々失敗する
- タイムアウトエラーが頻発

**原因**:
- タイムアウトが短すぎる
- 並行実行していない
- UI変化を待機していない

**解決**:
```typescript
// ❌ 悪い例
await button.click()
await expect(loader).toBeVisible({ timeout: 500 })  // 短すぎる

// ✅ 良い例
await Promise.all([
  (async () => {
    await expect(loader).toBeVisible({ timeout: 2000 })  // 余裕を持つ
    await expect(loader).toBeHidden({ timeout: 10000 })
  })(),
  button.click(),
])
```

### デバッグ方法

#### 1. コンソールログで状態確認

```typescript
async function handleAction() {
  console.log('[DEBUG] uiBusy: true')
  setUiBusy(true)

  const e2eDelay = getE2ECookie()
  console.log('[DEBUG] e2eDelay:', e2eDelay)

  if (e2eDelay) await delay(e2eDelay)

  console.log('[DEBUG] action start')
  const result = await action()
  console.log('[DEBUG] action end:', result)

  setUiBusy(false)
  console.log('[DEBUG] uiBusy: false')
}
```

#### 2. Playwrightのトレース機能

```bash
# トレースを有効化して実行
npx playwright test --trace on

# 失敗したテストのトレースを確認
npx playwright show-trace trace.zip
```

#### 3. スクリーンショット撮影

```typescript
test('デバッグ用', async ({ page }) => {
  await setE2EFlag(page, 700)

  await page.screenshot({ path: 'before-click.png' })

  await page.getByTestId('button').click()

  await page.screenshot({ path: 'after-click.png' })

  const loader = page.getByTestId('loader')
  await expect(loader).toBeVisible()

  await page.screenshot({ path: 'loader-visible.png' })
})
```

### パフォーマンス考慮事項

#### 1. E2E遅延は必要最小限に

```typescript
// ❌ 悪い例：遅延が長すぎる
await setE2EFlag(page, 5000)  // 5秒は長すぎる

// ✅ 良い例：必要最小限
await setE2EFlag(page, 700)  // 700msで十分
```

#### 2. 本番環境では遅延を無効化

```typescript
// 環境変数でE2E遅延を制御
const e2eDelay = process.env.NODE_ENV === 'test'
  ? getE2ECookie()
  : 0
```

#### 3. 並行実行でテスト高速化

```typescript
// ❌ 悪い例：逐次実行
await test1()
await test2()
await test3()

// ✅ 良い例：並行実行（依存関係がなければ）
await Promise.all([
  test1(),
  test2(),
  test3(),
])
```

---

## まとめ

### 重要なポイント

1. **UIフラグは非同期処理の前に立てる**
   - `setUiBusy(true)`を先に実行
   - DOMが確実に生成される

2. **Cookie > localStorage**
   - サブドメイン間で共有可能
   - ページ遷移後も有効

3. **UI変化 + データ変化を両方待機**
   - Cookie値だけでなく画面表示も確認
   - タイミング問題を回避

4. **並行検証でライフサイクル全体をテスト**
   - `Promise.all`で並行実行
   - `toBeAttached → toBeVisible → toBeHidden`

5. **最小表示時間でフラッシュ防止**
   - 300ms程度の余裕を持たせる
   - ユーザー体験も向上

### 適用チェックリスト

- [ ] ローディング表示が必要な非同期処理がある
- [ ] E2Eテストで検出できない問題が発生している
- [ ] マルチドメイン/サブドメイン構成である
- [ ] ページ遷移を伴う処理がある
- [ ] useTransitionのisPendingだけでは不十分

1つでも該当すれば、このドキュメントのパターンを適用できます！

---

## 参考リンク

- [Playwright Cookies API](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies)
- [React useTransition](https://react.dev/reference/react/useTransition)
- [Cookie Domain属性](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent)
- [実装ログ: 組織切り替えE2Eテスト修正](./IMPLEMENTATION_LOG.md#2025-10-24-組織切り替えe2eテストのローディングインジケーター問題修正)
