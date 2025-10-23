# 通知設定仕様書（草案）

> ⚠️ **注意:** この仕様はまだ確定していません。実装前に要件を再確認してください。

**作成日:** 2025-10-19
**ステータス:** 🔶 Draft（草案）
**想定実装時期:** 未定

---

## 概要

ユーザーごとの通知設定を`profiles.metadata.notify`に格納する設計。
将来的な拡張性を考慮し、バージョニング・チャネル/トピック分離・静穏時間などの概念を組み込む。

## スコープ

### ✅ 含まれるもの
- ユーザーの通知設定（好み）の保存
- チャネル別の有効/無効（email, push, web）
- トピック別の設定（member, billing, usage, security）
- 静穏時間・ダイジェスト頻度の設定
- バージョニングによる後方互換性

### ❌ 含まれないもの
- 通知履歴（いつ、どんな通知が送られたか）
- 既読/未読管理
- 実際の通知送信ロジック（メール配信、Push配信等）

## データ構造

### profiles.metadata.notify

```json
{
  "notify": {
    "v": 1,
    "updatedAt": "2025-10-19T09:00:00Z",
    "channels": {
      "email": {
        "enabled": true,
        "address": null,
        "digest": {
          "daily": false,
          "weekly": true
        }
      },
      "push": {
        "enabled": false,
        "devices": []
      },
      "web": {
        "enabled": true
      }
    },
    "quietHours": {
      "tz": "Asia/Tokyo",
      "start": "22:00",
      "end": "07:00"
    },
    "rules": {
      "frequency": "immediate",
      "locale": "ja-JP"
    },
    "topics": {
      "member": {
        "new": true
      },
      "billing": {
        "subscription": true,
        "invoice": false
      },
      "usage": {
        "quota": true
      },
      "security": {
        "login": true,
        "anomaly": true
      }
    }
  }
}
```

## 設計の利点

### 1. バージョニング (`v`, `updatedAt`)
- スキーマ進化に対応
- 後方互換性を保持
- 楽観的ロック（競合検知）が可能

### 2. チャネル×トピックの分離
- チャネル（email/push/web）の有効/無効を個別管理
- トピック（member/billing/usage/security）別の細かい設定
- 将来のSlack/Webhook追加が容易

### 3. 運用に必要な概念を先置き
- `quietHours`: 静穏時間（夜間の通知停止）
- `frequency`: immediate/daily/weekly（ダイジェスト配信）
- `digest`: チャネル別のダイジェスト設定

## 実装方針

### TypeScript型定義

**ファイル:** `src/types/database.ts`

```typescript
export interface NotificationSettings {
  v: number
  updatedAt: string
  channels: {
    email: {
      enabled: boolean
      address: string | null
      digest: {
        daily: boolean
        weekly: boolean
      }
    }
    push: {
      enabled: boolean
      devices: string[]
    }
    web: {
      enabled: boolean
    }
  }
  quietHours: {
    tz: string
    start: string  // "HH:mm"
    end: string    // "HH:mm"
  }
  rules: {
    frequency: 'immediate' | 'daily' | 'weekly'
    locale: string
  }
  topics: {
    member: { new: boolean }
    billing: { subscription: boolean; invoice: boolean }
    usage: { quota: boolean }
    security: { login: boolean; anomaly: boolean }
  }
}
```

### デフォルト値

```typescript
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  v: 1,
  updatedAt: new Date().toISOString(),
  channels: {
    email: { enabled: true, address: null, digest: { daily: false, weekly: false } },
    push: { enabled: false, devices: [] },
    web: { enabled: true }
  },
  quietHours: { tz: 'Asia/Tokyo', start: '22:00', end: '07:00' },
  rules: { frequency: 'immediate', locale: 'ja-JP' },
  topics: {
    member: { new: true },
    billing: { subscription: true, invoice: false },
    usage: { quota: true },
    security: { login: true, anomaly: true }
  }
}
```

### Server Action

**ファイル:** `src/app/actions/profile.ts`（新規作成）

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateNotificationSettings(settings: NotificationSettings) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // 既存のmetadataを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('id', user.id)
    .single()

  // notifyをマージして更新
  const updatedMetadata = {
    ...(profile?.metadata || {}),
    notify: {
      ...settings,
      updatedAt: new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ metadata: updatedMetadata })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/app/settings/notifications')
  return { success: true }
}
```

### UI修正

**ファイル:** `src/app/app/settings/notifications/page.tsx`

- 初期値を`metadata.notify`から読み込み
- 欠損項目はデフォルト値で補完
- `alert()`削除 → Server Action呼び出し
- トースト表示追加

## 将来の拡張計画

### Phase 2: 通知履歴テーブル

**通知履歴が必要になった場合:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  type TEXT NOT NULL,           -- 'member_joined', 'billing_alert'等
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,

  -- 送信履歴
  sent_via JSONB,  -- {"email": true, "push": false, "web": true}
  sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
)
```

### Phase 3: 専用設定テーブルへの移行

**設定が複雑化した場合:**

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  channel TEXT NOT NULL,      -- 'email', 'push', 'slack', 'webhook'
  event_type TEXT NOT NULL,   -- 'member.new', 'billing.subscription'
  enabled BOOLEAN DEFAULT true,
  settings JSONB,             -- 頻度、時間帯等の詳細設定
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

この場合、`profiles.metadata.notify.v: 2`にして、
新バージョンでは専用テーブルを参照するよう切り替え可能。

## 未解決事項

### 1. ダイジェスト配信の運用
- [ ] 日次/週次以外の周期が必要か？
- [ ] ダイジェストの配信時刻は？
- [ ] タイムゾーンの扱い

### 2. 法務/監査要件
- [ ] オプトアウト履歴の保存は必要か？
- [ ] 誰が/いつ/何を変更したかの監査ログ
- [ ] GDPR等のコンプライアンス対応

### 3. 実際の通知配信
- [ ] 配信ロジックの責務境界
- [ ] 配信失敗時の再送ポリシー
- [ ] レート制限（スパム防止）

## 実装見積もり

| 項目 | 時間 | 詳細 |
|------|------|------|
| 型定義 + Zodスキーマ | 15分 | NotificationSettings型、デフォルト値、バリデーション |
| Server Action | 20分 | サーバサイドマージ、楽観ロック、更新処理 |
| UI修正 | 25分 | 初期値読み込み、保存処理、トースト表示 |
| 動作確認 | 10分 | 保存確認、ブラウザテスト |
| **合計** | **70分** | **⭐⭐ 中程度（汎用性高い）** |

## 参考資料

- 既存実装: `src/app/app/settings/notifications/page.tsx`
- データベーススキーマ: `docs/specifications/DATABASE_SCHEMA.md`
- プロフィール管理: `src/app/actions/auth.ts`

---

**次のステップ:**
1. 要件の確定（通知履歴の必要性、法務要件等）
2. 実装の優先度決定
3. 実装（推定70分）
4. E2Eテスト追加


Phase 0: 超シンプル版（2-3時間）
├── 基本的なページ作成・表示
├── シンプルなMarkdownエディタ
└── 組織内でのみアクセス可能

Phase 1: 基本機能（4-5時間）
├── 階層構造
├── 検索機能
└── ファイルアップロード

Phase 2: 高度な機能（残り時間）
├── バージョン管理
├── コメント機能
└── UI/UX改善