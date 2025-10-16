# E2Eテスト実行ガイド

Playwrightを使用したE2Eテストの実行方法。

## 🚀 クイックスタート

### テスト実行

```bash
# localhost環境
npm run test:e2e              # ヘッドレスモード
npm run test:e2e:ui           # UI表示（推奨）
npm run test:e2e:headed       # ブラウザ表示

# Preview環境（cocktailorder.com）
npm run test:e2e:preview

# 本番環境
npm run test:e2e:production

# 特定のテストのみ
npx playwright test e2e/localhost.spec.ts
npx playwright test e2e/auth.spec.ts

# 特定のブラウザ
npx playwright test --project=chromium
```

### テスト結果確認

```bash
npx playwright show-report
```

## 📝 テストスイート

### 1. 認証フロー (`e2e/auth.spec.ts`)
- サインアップ、ログイン、パスワードリセット、OAuth

### 2. 組織管理 (`e2e/organization.spec.ts`)
- 作成、編集、切り替え

### 3. メンバー管理 (`e2e/members.spec.ts`)
- 招待、ロール変更、削除、招待受諾

### 4. マルチドメイン (`e2e/multi-domain.spec.ts`)
- WWW/APP/ADMIN/OPSドメインアクセス、404確認

### 5. localhost環境 (`e2e/localhost.spec.ts`)
- サブドメインアクセス、Cookie共有テスト（`.localhost`）

### 6. Preview環境 (`e2e/vercel-preview.spec.ts`)
- サブドメインアクセス、Cookie共有テスト（`.cocktailorder.com`）

## ⚙️ 設定

### playwright.config.ts

```typescript
// 環境変数でbaseURLを切り替え
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// ローカル環境のみwebServerを自動起動
webServer: process.env.PLAYWRIGHT_BASE_URL
  ? undefined
  : { command: 'npm run dev', url: 'http://localhost:3000' }
```

### 環境別テスト

```bash
# localhost
npm run test:e2e

# Preview
PLAYWRIGHT_BASE_URL=https://www.cocktailorder.com npx playwright test

# 本番
PLAYWRIGHT_BASE_URL=https://your-domain.com npx playwright test
```

## 🐛 デバッグ

### UIモード（推奨）
```bash
npm run test:e2e:ui
```
- ステップ実行、ブラウザ状態確認、セレクタ確認

### デバッグモード
```bash
npx playwright test --debug
npx playwright test e2e/auth.spec.ts --debug
```

### トレース確認
```bash
npx playwright show-trace trace.zip
```

## 🚨 よくある問題

### `ERR_CONNECTION_REFUSED`
→ 開発サーバーが起動していない: `npm run dev`

### `Supabase client error`
→ 環境変数未設定: `.env.local`を確認

### テストが `verify-email` で止まる
→ Supabaseで「Email confirmations」をOFF

### ログインテスト失敗
→ テストアカウントが存在しない: 手動作成または動的生成

### ポート使用中
```bash
lsof -i :3000
kill -9 <PID>
```

## 🎯 ベストプラクティス

1. **テスト専用データベース**: 本番とテストを分離
2. **データクリーンアップ**: `npm run supabase:clear`
3. **`data-testid` 使用**: セレクタの安定性向上
4. **タイムアウト調整**: 必要に応じて延長

```typescript
test.setTimeout(60000) // 60秒
await page.goto('url', { timeout: 30000 })
```

## 📈 CI/CD例（GitHub Actions）

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '18' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🔗 参考

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
