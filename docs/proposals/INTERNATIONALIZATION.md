# 国際化（i18n）対応提案

## 概要

next-intlを使用して英語対応を実装し、グローバル展開の基盤を構築します。

## 現状の課題

- すべてのテキストが日本語でハードコーディング
- i18nライブラリ未導入
- 言語切り替え機能なし
- タイムゾーン・日付フォーマット未対応

## 改善項目

### 1. next-intlの導入

**インストール**:
```bash
npm install next-intl
```

**ディレクトリ構成**:
```
messages/
  ├── ja.json    # 日本語
  └── en.json    # 英語
```

### 2. 翻訳ファイルの作成

**messages/ja.json**:
```json
{
  "common": {
    "login": "ログイン",
    "logout": "ログアウト",
    "save": "保存",
    "cancel": "キャンセル"
  },
  "navigation": {
    "dashboard": "ダッシュボード",
    "members": "メンバー管理",
    "settings": "設定"
  },
  "errors": {
    "required": "{field}は必須です",
    "unauthorized": "権限がありません"
  }
}
```

**messages/en.json**:
```json
{
  "common": {
    "login": "Login",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "members": "Members",
    "settings": "Settings"
  },
  "errors": {
    "required": "{field} is required",
    "unauthorized": "Unauthorized"
  }
}
```

### 3. 設定ファイル

**i18n.ts**:
```typescript
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default
}))
```

**middleware.ts に追加**:
```typescript
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['ja', 'en'],
  defaultLocale: 'ja'
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
```

### 4. コンポーネントでの使用

**Before**:
```tsx
<button>ログイン</button>
<p>メンバー管理</p>
```

**After**:
```tsx
import { useTranslations } from 'next-intl'

function LoginButton() {
  const t = useTranslations('common')
  return <button>{t('login')}</button>
}

function Nav() {
  const t = useTranslations('navigation')
  return <p>{t('members')}</p>
}
```

### 5. 言語切り替え機能

**LanguageSwitcher.tsx**:
```tsx
'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  const switchLanguage = (newLocale: string) => {
    // Cookie に保存
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    router.refresh()
  }

  return (
    <select
      value={locale}
      onChange={(e) => switchLanguage(e.target.value)}
      className="border rounded px-2 py-1"
    >
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  )
}
```

### 6. 日付・時刻のローカライズ

**Before**:
```tsx
{new Date().toLocaleDateString()}
```

**After**:
```tsx
import { useFormatter } from 'next-intl'

function DateDisplay({ date }: { date: Date }) {
  const format = useFormatter()

  return (
    <time>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </time>
  )
}
```

### 7. 数値・通貨のフォーマット

```tsx
const format = useFormatter()

// 数値
format.number(1234.56) // ja: "1,234.56" / en: "1,234.56"

// 通貨
format.number(1000, {
  style: 'currency',
  currency: 'JPY'
}) // ja: "¥1,000" / en: "¥1,000"
```

## 実装ファイル

### フェーズ1: 基本設定（2時間）

1. `i18n.ts` - 設定ファイル
2. `messages/ja.json` - 日本語翻訳
3. `messages/en.json` - 英語翻訳
4. `middleware.ts` - ロケール検出

### フェーズ2: コンポーネント対応（8時間）

5. `src/app/admin/layout.tsx`
6. `src/app/app/layout.tsx`
7. `src/components/LanguageSwitcher.tsx`（新規）
8. すべてのハードコーディングテキストを置換

### フェーズ3: 動的コンテンツ（2時間）

9. エラーメッセージ
10. バリデーションメッセージ
11. メール通知テンプレート

## 翻訳対象テキスト

### 優先度: 高

- ナビゲーション（10項目）
- 認証画面（15項目）
- エラーメッセージ（20項目）
- ボタンラベル（15項目）

### 優先度: 中

- フォームラベル（30項目）
- ヘルプテキスト（20項目）
- 通知メッセージ（15項目）

### 優先度: 低

- 詳細説明文（50項目）
- ドキュメント（100項目）

**合計翻訳数**: 約275項目

## 想定工数

| 項目 | 工数 | 優先度 |
|------|------|--------|
| next-intl設定 | 2h | 高 |
| 翻訳ファイル作成 | 4h | 高 |
| コンポーネント対応 | 8h | 高 |
| 言語切り替え機能 | 2h | 中 |
| 日付・数値対応 | 2h | 中 |

**合計**: 18時間

## 翻訳フロー

### 開発フロー

1. 開発者: 日本語でコーディング
2. `messages/ja.json` に追加
3. `messages/en.json` にキーのみ追加（値は空）
4. 翻訳者: 英語を追加

### ツール

- **DeepL API**: 自動翻訳の下書き
- **i18n Ally**: VSCode拡張（翻訳管理）
- **翻訳チェック**: 専門翻訳者によるレビュー

## テスト

```typescript
// E2Eテスト
test('言語切り替え', async ({ page }) => {
  await page.goto('/admin')

  // 日本語で表示
  await expect(page.locator('text=ログイン')).toBeVisible()

  // 英語に切り替え
  await page.selectOption('select[name="language"]', 'en')

  // 英語で表示
  await expect(page.locator('text=Login')).toBeVisible()
})
```

## 成果指標

- 翻訳カバレッジ: 0% → 100%
- 対応言語: 日本語のみ → 日本語・英語
- ハードコーディング: 275箇所 → 0箇所

## 今後の展開

### 追加言語候補

1. 中国語（簡体字）
2. 韓国語
3. スペイン語
4. フランス語

### RTL（右から左）言語対応

アラビア語など、将来的に対応する場合：
```tsx
<html dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

## 参考資料

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/)
- [CLDR](https://cldr.unicode.org/) - ロケールデータ
- [i18n Ally VSCode Extension](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)
