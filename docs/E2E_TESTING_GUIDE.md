# E2Eテスト実行ガイド

このガイドでは、Playwrightを使用したE2Eテストの実行方法を説明します。

## 📋 前提条件

E2Eテストを実行する前に、以下が完了していることを確認してください：

- [x] `SERVICES_ACCOUNT_SETUP.md` に従ってサービスアカウント作成完了
- [x] `.env.local` に環境変数を設定
- [x] Supabaseでデータベースマイグレーション実行
- [x] 開発サーバーが起動できる状態

## 🚀 クイックスタート

### 1. テスト用データベースの準備（推奨）

本番データベースとは別に、テスト専用のSupabaseプロジェクトを作成することを推奨します。

```bash
# テスト用の環境変数ファイルを作成
cp .env.development .env.test

# .env.test を編集してテスト用Supabaseプロジェクトの情報を設定
```

### 2. E2Eテストの実行

#### localhost環境でのテスト

```bash
# すべてのテストを実行（ヘッドレスモード）
npm run test:e2e

# UIモードで実行（推奨：テストの進行を確認できる）
npm run test:e2e:ui

# ブラウザを表示して実行（デバッグ用）
npm run test:e2e:headed

# 特定のテストファイルのみ実行
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/localhost.spec.ts

# 特定のブラウザで実行
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

#### Preview環境（cocktailorder.com）でのテスト

```bash
# Preview環境でテスト実行
npm run test:e2e:preview

# Preview環境で特定のテストのみ実行
PLAYWRIGHT_BASE_URL=https://www.cocktailorder.com npx playwright test e2e/vercel-preview.spec.ts
```

#### 本番環境でのテスト

```bash
# 本番環境でテスト実行（本番ドメイン設定後）
npm run test:e2e:production
```

### 3. テスト結果の確認

```bash
# テスト実行後、HTMLレポートを開く
npx playwright show-report
```

## 📝 現在のテストスイート

### 1. 認証フロー (`e2e/auth.spec.ts`)

- **サインアップフロー**: 新規アカウント作成
- **ログインフロー**: 既存アカウントでログイン
- **パスワードリセットフロー**: パスワード忘れた場合の処理
- **Google OAuthボタン表示確認**

### 2. 組織管理 (`e2e/organization.spec.ts`)

- **組織作成フロー**: 新しい組織の作成
- **組織設定の編集**: 組織名などの変更
- **組織の切り替え**: 複数組織間の切り替え

### 3. メンバー管理 (`e2e/members.spec.ts`)

- **メンバー招待フロー**: メール招待の送信
- **メンバーのロール変更**: ロール変更機能
- **メンバーの削除**: メンバー削除機能
- **招待リンクからの参加**: 招待受諾フロー

### 4. マルチドメイン (`e2e/multi-domain.spec.ts`)

- **WWWドメインアクセス**: マーケティングページ
- **APPドメイン認証チェック**: 認証が必要なことを確認
- **ADMINドメイン**: 管理画面へのアクセス
- **OPSドメイン**: 運用画面へのアクセス
- **未知のサブドメイン**: 404エラーの確認

### 5. localhost環境テスト (`e2e/localhost.spec.ts`) ✨ 新規追加

- **WWWドメイン表示**: `http://localhost:3000`
- **APPサブドメインアクセス**: `http://app.localhost:3000`
- **ADMINサブドメインアクセス**: `http://admin.localhost:3000`
- **OPSサブドメインアクセス**: `http://ops.localhost:3000`
- **サブドメイン間のCookie共有テスト**: `.localhost` ドメインでのCookie共有を検証

### 6. Preview環境テスト (`e2e/vercel-preview.spec.ts`) ✨ 新規追加

- **WWWドメイン表示**: `https://www.cocktailorder.com`
- **APPサブドメインアクセス**: `https://app.cocktailorder.com`
- **ADMINサブドメインアクセス**: `https://admin.cocktailorder.com`
- **OPSサブドメインアクセス**: `https://ops.cocktailorder.com`
- **サブドメイン間のCookie共有テスト**: `.cocktailorder.com` ドメインでのCookie共有を検証

## ⚙️ テスト設定

### playwright.config.ts

```typescript
// 環境変数からbaseURLを取得（デフォルトはlocalhost）
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',           // テストディレクトリ
  fullyParallel: true,        // 並列実行
  retries: process.env.CI ? 2 : 0,  // CI環境でリトライ

  use: {
    baseURL,                  // 環境変数で切り替え可能
    trace: 'on-first-retry',  // 失敗時にトレース保存
  },

  // ローカル環境でのみwebServerを起動（Vercelテスト時は不要）
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',   // テスト前に開発サーバー起動
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
})
```

### 環境別のテスト実行

#### localhost環境
```bash
# 環境変数なし、または明示的に指定
npm run test:e2e
# または
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

#### Preview環境（cocktailorder.com）
```bash
# package.jsonのコマンドを使用
npm run test:e2e:preview
# または環境変数で指定
PLAYWRIGHT_BASE_URL=https://www.cocktailorder.com npx playwright test
```

#### 本番環境
```bash
npm run test:e2e:production
# または環境変数で指定
PLAYWRIGHT_BASE_URL=https://your-production-domain.com npx playwright test
```

## 🔧 テストのカスタマイズ

### 既存アカウントでログインテストを実行する場合

1. 開発環境で手動でアカウント作成
   ```
   メールアドレス: test@example.com
   パスワード: password123
   ```

2. 組織を作成して、メンバーを追加

3. テスト実行

### テストごとに新規アカウントを作成する場合（推奨）

`e2e/auth.spec.ts` はすでに動的にアカウントを作成する仕組みになっています：

```typescript
const timestamp = Date.now()
const testEmail = `test-${timestamp}@example.com`
```

## 🐛 デバッグ方法

### 1. UIモードでステップ実行

```bash
npm run test:e2e:ui
```

- テストの進行を1ステップずつ確認
- ブラウザの状態を確認
- セレクタの確認

### 2. ヘッドモードで実行

```bash
npm run test:e2e:headed
```

- ブラウザが表示され、テストの様子を見られる

### 3. デバッグモード

```bash
# デバッグモードでテストを実行
npx playwright test --debug

# 特定のテストをデバッグ
npx playwright test e2e/auth.spec.ts --debug
```

### 4. スクリーンショット撮影

テストコード内にスクリーンショット撮影を追加：

```typescript
await page.screenshot({ path: 'screenshot.png' })
```

### 5. トレースファイルの確認

テスト失敗時、トレースファイルが自動生成されます：

```bash
npx playwright show-trace trace.zip
```

## 📊 テストカバレッジ

### 現在カバーされている機能

- ✅ サインアップ
- ✅ ログイン
- ✅ パスワードリセット
- ✅ 組織作成
- ✅ 組織編集
- ✅ メンバー招待
- ✅ ロール変更
- ✅ マルチドメインルーティング

### まだカバーされていない機能

- [ ] サブスクリプション変更
- [ ] ファイルアップロード（R2）
- [ ] APIキー管理
- [ ] 監査ログ確認
- [ ] 使用量制限チェック

## 🚨 よくある問題と解決方法

### 問題1: `Error: page.goto: net::ERR_CONNECTION_REFUSED`

**原因**: 開発サーバーが起動していない

**解決方法**:
```bash
# 別のターミナルで開発サーバーを起動
npm run dev

# または、playwright.config.tsの設定を確認
```

### 問題2: `Error: Supabase client error`

**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# .env.localを確認
cat .env.local

# 必要な環境変数を設定
npm run env:dev
```

### 問題3: テストが `verify-email` で止まる

**原因**: メール確認が必要だが、実際のメールは送信されない

**解決方法（開発環境）**:

Supabaseダッシュボードで「Email confirmations」を無効化：
1. Authentication → Settings
2. 「Enable email confirmations」をOFF

または、Supabaseの「Email templates」で確認リンクを取得。

### 問題4: ログインテストが失敗する

**原因**: テストアカウントが存在しない

**解決方法A**: 手動でアカウント作成
```
メールアドレス: test@example.com
パスワード: password123
```

**解決方法B**: テストコードを修正して動的に作成（推奨）

### 問題5: `localhost:3000` にアクセスできない

**原因**: ポートがすでに使用されている

**解決方法**:
```bash
# ポートを使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

## 🎯 ベストプラクティス

### 1. テスト専用データベースを使用

本番データベースとテストデータベースを分離：

```bash
# .env.test を作成
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
```

### 2. テストデータのクリーンアップ

各テスト後、作成したデータを削除：

```typescript
test.afterEach(async () => {
  // テストで作成したデータを削除
  await supabase.from('organizations').delete().eq('name', 'テスト組織')
})
```

### 3. 並列実行を避ける場合

データベースの競合を避けるため：

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: false,  // 順次実行
  workers: 1,            // 1ワーカーのみ
})
```

### 4. タイムアウトを調整

遅いネットワークの場合：

```typescript
// テスト全体のタイムアウト
test.setTimeout(60000) // 60秒

// 個別のアクションのタイムアウト
await page.goto('http://localhost:3000', { timeout: 30000 })
```

### 5. セレクタにdata-testid を使用

テストの安定性向上：

```typescript
// コンポーネント
<button data-testid="submit-button">送信</button>

// テストコード
await page.click('[data-testid="submit-button"]')
```

## 📈 CI/CDでのテスト実行

### GitHub Actionsの例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 🔗 参考リンク

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## 📝 テスト追加のガイドライン

新しいE2Eテストを追加する場合：

1. **テストファイルを作成**
   ```bash
   # e2e/your-feature.spec.ts
   ```

2. **テストの構造**
   ```typescript
   import { test, expect } from '@playwright/test'

   test.describe('機能名', () => {
     test.beforeEach(async ({ page }) => {
       // 各テスト前の準備
     })

     test('テストケース1', async ({ page }) => {
       // テストコード
     })

     test.afterEach(async () => {
       // クリーンアップ
     })
   })
   ```

3. **実行して確認**
   ```bash
   npx playwright test e2e/your-feature.spec.ts --headed
   ```

---

E2Eテストを活用して、アプリケーションの品質を高めましょう！
