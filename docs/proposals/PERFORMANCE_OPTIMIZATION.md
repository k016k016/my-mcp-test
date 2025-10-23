# パフォーマンス最適化提案

## 概要

Next.jsの最適化機能を活用し、ページ読み込み速度とユーザー体験を改善します。

## 現状の課題

- 画像最適化なし（`<img>`タグを直接使用）
- バンドルサイズが未分析
- コードスプリッティングが最適化されていない
- フォントの最適化が未実装

## 改善項目

### 1. Next.js Image最適化の導入

**対象ファイル**:
- すべての`<img>`タグ → `<Image>`コンポーネントに置き換え

**実装例**:
```tsx
// Before
<img src="/logo.png" alt="Logo" />

// After
import Image from 'next/image'
<Image src="/logo.png" alt="Logo" width={200} height={50} />
```

**効果**:
- 自動WebP変換
- 遅延読み込み
- レスポンシブ画像生成

### 2. バンドルサイズ分析

**実装**:
```bash
# 分析ツールの導入
npm install -D @next/bundle-analyzer

# next.config.mjsに追加
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
```

**実行**:
```bash
ANALYZE=true npm run build
```

### 3. フォント最適化

**実装**:
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={inter.className}>
      {children}
    </html>
  )
}
```

### 4. Dynamic Import

**対象**:
- 重いコンポーネント（チャート、エディタなど）

**実装例**:
```tsx
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <p>読み込み中...</p>,
  ssr: false
})
```

## 想定工数

| 項目 | 工数 | 優先度 |
|------|------|--------|
| Image最適化 | 2h | 高 |
| バンドルサイズ分析 | 1h | 中 |
| フォント最適化 | 1h | 中 |
| Dynamic Import | 2h | 低 |

**合計**: 6時間

## 成果指標

- Lighthouse Performance スコア: 70 → 90+
- First Contentful Paint (FCP): -30%
- Largest Contentful Paint (LCP): -40%
- バンドルサイズ: -20%

## 参考資料

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
