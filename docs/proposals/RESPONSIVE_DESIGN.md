# レスポンシブデザイン改善提案

## 概要

モバイルファーストアプローチで、すべてのデバイスで最適な体験を提供します。

## 現状の課題

- デスクトップ優先の設計
- モバイルでサイドバーが表示されたまま
- タブレットでのレイアウト崩れ
- タッチ操作への配慮不足

## 改善項目

### 1. ブレークポイント戦略

**Tailwind CSS標準ブレークポイントを使用**:
```
sm: 640px   (モバイル横向き)
md: 768px   (タブレット)
lg: 1024px  (ノートPC)
xl: 1280px  (デスクトップ)
2xl: 1536px (大画面)
```

### 2. サイドバーのレスポンシブ対応

**現状**:
```tsx
// デスクトップのみ
<aside className="w-64 bg-gray-900">
```

**改善後**:
```tsx
// モバイル: ハンバーガーメニュー
// タブレット: 折りたたみ可能
// デスクトップ: 常時表示

<aside className="
  fixed lg:static
  w-64
  -translate-x-full lg:translate-x-0
  transition-transform
  z-50
">
```

**追加機能**:
- ハンバーガーメニューボタン（モバイル）
- オーバーレイ背景（メニュー展開時）
- スワイプジェスチャー対応

### 3. テーブルのレスポンシブ化

**対象**: メンバー一覧、監査ログなど

**実装パターン**:
```tsx
// モバイル: カード表示
// デスクトップ: テーブル表示

<div className="
  block md:hidden
  // カードレイアウト
">

<table className="
  hidden md:table
  // テーブルレイアウト
">
```

### 4. フォームの最適化

**改善点**:
- タッチターゲットサイズ: 最小44x44px
- 入力フィールドの適切な間隔
- モバイルキーボード対応（inputmode属性）

**実装例**:
```tsx
<input
  type="email"
  inputMode="email"
  className="
    h-12 md:h-10
    px-4 md:px-3
    text-base md:text-sm
  "
/>
```

### 5. ナビゲーションの改善

**モバイル用ボトムナビゲーション**:
```tsx
<nav className="
  lg:hidden
  fixed bottom-0 left-0 right-0
  flex justify-around
  bg-white border-t
  h-16
">
  <button>ホーム</button>
  <button>設定</button>
  <button>プロフィール</button>
</nav>
```

## 実装ファイル

### 対象ファイル（優先順）

1. `src/app/admin/layout.tsx` - 管理画面レイアウト
2. `src/app/app/layout.tsx` - ユーザー画面レイアウト
3. `src/components/MemberList.tsx` - テーブルコンポーネント
4. `src/components/OrganizationSwitcher.tsx` - ドロップダウン

### 新規コンポーネント

- `src/components/MobileNav.tsx` - モバイルナビゲーション
- `src/components/HamburgerButton.tsx` - メニューボタン
- `src/components/Sidebar.tsx` - レスポンシブサイドバー

## 想定工数

| 項目 | 工数 | 優先度 |
|------|------|--------|
| サイドバー対応 | 4h | 高 |
| テーブル対応 | 3h | 高 |
| フォーム最適化 | 2h | 中 |
| ボトムナビ | 2h | 中 |

**合計**: 11時間

## テスト項目

- [ ] iPhone SE (375px)
- [ ] iPhone 14 Pro (393px)
- [ ] iPad (768px)
- [ ] iPad Pro (1024px)
- [ ] デスクトップ (1920px)

## 成果指標

- モバイルLighthouseスコア: 60 → 90+
- タッチターゲットエラー: 0件
- 横スクロール発生: 0件
- CLS (Cumulative Layout Shift): < 0.1

## 参考資料

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
