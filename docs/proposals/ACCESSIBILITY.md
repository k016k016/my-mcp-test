# アクセシビリティ対応提案

## 概要

WCAG 2.1 AA基準に準拠し、すべてのユーザーが利用できるアプリケーションを実現します。

## 現状の課題

- ARIA属性が未設定
- キーボードナビゲーション未対応
- スクリーンリーダー対応なし
- カラーコントラスト比未検証
- フォーカスインジケーター不明瞭

## 改善項目

### 1. セマンティックHTML

**Before**:
```tsx
<div onClick={handleClick}>クリック</div>
```

**After**:
```tsx
<button onClick={handleClick}>クリック</button>
```

**対象**:
- すべてのクリック可能要素
- ナビゲーション構造
- フォーム要素

### 2. ARIA属性の追加

**ドロップダウンメニュー**:
```tsx
<button
  aria-haspopup="true"
  aria-expanded={isOpen}
  aria-controls="menu-id"
>
  メニュー
</button>

<ul
  id="menu-id"
  role="menu"
  aria-labelledby="menu-button"
>
```

**ローディング状態**:
```tsx
<div
  role="status"
  aria-live="polite"
  aria-busy={isLoading}
>
  {isLoading ? '読み込み中...' : 'Complete'}
</div>
```

**エラーメッセージ**:
```tsx
<input
  aria-invalid={hasError}
  aria-describedby="error-msg"
/>
<span id="error-msg" role="alert">
  {errorMessage}
</span>
```

### 3. キーボードナビゲーション

**実装必須項目**:

| 操作 | キー | 実装場所 |
|------|------|----------|
| メニュー開閉 | Enter/Space | OrganizationSwitcher |
| メニュー移動 | ↑↓ | ドロップダウン |
| モーダル閉じる | Esc | すべてのモーダル |
| フォーム送信 | Enter | すべてのフォーム |
| タブ移動 | Tab | すべてのページ |

**実装例**:
```tsx
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Escape':
      closeModal()
      break
    case 'ArrowDown':
      e.preventDefault()
      focusNextItem()
      break
    case 'ArrowUp':
      e.preventDefault()
      focusPreviousItem()
      break
  }
}
```

### 4. フォーカス管理

**フォーカスインジケーター**:
```tsx
<button className="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500
  focus:ring-offset-2
">
```

**フォーカストラップ（モーダル内）**:
```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap'

const Modal = () => {
  const trapRef = useFocusTrap()

  return (
    <div ref={trapRef} role="dialog">
      {/* モーダルコンテンツ */}
    </div>
  )
}
```

### 5. カラーコントラスト

**WCAG AA基準**:
- 通常テキスト: 4.5:1
- 大きいテキスト: 3:1

**チェック対象**:
```tsx
// NG: コントラスト比 2.5:1
<p className="text-gray-400">グレーテキスト</p>

// OK: コントラスト比 7:1
<p className="text-gray-700">ダークグレーテキスト</p>
```

### 6. 代替テキスト

**画像**:
```tsx
<img
  src="/logo.png"
  alt="会社ロゴ - Example SaaS"
/>
```

**アイコンボタン**:
```tsx
<button aria-label="メニューを開く">
  <svg aria-hidden="true">
    <path d="..." />
  </svg>
</button>
```

### 7. ランドマークとヘッディング

**ページ構造**:
```tsx
<body>
  <header>
    <h1>ページタイトル</h1>
    <nav aria-label="メインナビゲーション">
  </header>

  <main>
    <h2>セクション見出し</h2>
  </main>

  <aside aria-label="サイドバー">

  <footer>
</body>
```

## 実装ファイル

### 優先度: 高

1. `src/components/OrganizationSwitcher.tsx`
2. `src/components/Modal.tsx`（新規作成）
3. `src/app/admin/layout.tsx`
4. `src/app/app/layout.tsx`

### 優先度: 中

5. `src/components/MemberList.tsx`
6. `src/components/InvitationForm.tsx`
7. すべてのフォームコンポーネント

## 導入ツール

### 開発時チェック

```bash
# ESLintプラグイン
npm install -D eslint-plugin-jsx-a11y

# .eslintrc.json に追加
{
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

### テスト

```bash
# axe-coreの導入
npm install -D @axe-core/react

# Playwrightでの自動テスト
npm install -D @axe-core/playwright
```

**E2Eテスト例**:
```typescript
import { injectAxe, checkA11y } from 'axe-playwright'

test('アクセシビリティチェック', async ({ page }) => {
  await page.goto('/admin')
  await injectAxe(page)
  await checkA11y(page)
})
```

## 想定工数

| 項目 | 工数 | 優先度 |
|------|------|--------|
| ARIA属性追加 | 4h | 高 |
| キーボードナビ | 6h | 高 |
| フォーカス管理 | 3h | 高 |
| コントラスト修正 | 2h | 中 |
| 代替テキスト | 2h | 中 |
| ランドマーク | 1h | 低 |

**合計**: 18時間

## チェックリスト

- [ ] すべてのクリック可能要素にキーボードアクセス
- [ ] フォームにラベルとエラーメッセージ
- [ ] カラーコントラスト比 4.5:1以上
- [ ] すべての画像に代替テキスト
- [ ] スクリーンリーダーで操作可能
- [ ] axe-core違反0件

## 成果指標

- Lighthouse Accessibility: 70 → 100
- WCAG AA準拠率: 0% → 100%
- axe-core違反: 現状 → 0件

## 参考資料

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
