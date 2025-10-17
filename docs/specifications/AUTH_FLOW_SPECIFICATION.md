# 認証フロー仕様書

最終更新: 2025-01-16

## 📋 概要

マルチテナントSaaSの認証・権限管理フローの仕様書

## 🎯 ユーザー分類と権限

### **1. ユーザー種別**

| ユーザー種別 | ドメイン | 組織 | ログイン画面 | 説明 |
|-------------|---------|------|-------------|------|
| **一般ユーザー** | APP | 必要 | `/login` | 組織内の一般機能利用 |
| **管理者** | APP + ADMIN | 必要 | `/login` | 組織内のユーザー管理・設定 |
| **運用担当者** | OPS | 不要 | `ops.xxx.com/login` | システム全体の管理・監視 |

### **2. レイアウト設計**

#### **APPドメイン**
- **デザイン**: モダンなグラデーション背景（青系）
- **ヘッダー**: 横並びナビゲーション + 組織切り替え + ユーザーメニュー
- **特徴**: 一般ユーザー向けの親しみやすいデザイン

#### **ADMINドメイン**
- **デザイン**: サイドバー + メインコンテンツ（紫系アクセント）
- **ヘッダー**: サイドバーナビゲーション + 組織切り替え + ユーザーメニュー
- **特徴**: 管理機能に特化したレイアウト

#### **OPSドメイン**
- **デザイン**: ダークテーマ（黒・赤系）
- **ヘッダー**: 横並びナビゲーション + ユーザーメニュー
- **特徴**: 運用担当者向けのプロフェッショナルなデザイン

### **2. 権限階層**

```
OPS (運用担当者)
├── システム全体を管理
├── 組織・ユーザーを管理
├── システムログ・監査ログ確認
├── サブスクリプション状況確認
└── システムヘルスチェック

ADMIN (組織管理者)
├── 組織内のユーザー管理
├── メンバー招待・権限設定
└── 組織設定管理

APP (一般ユーザー)
├── 組織内の一般機能利用
└── 自分のプロフィール管理
```

## 🔐 認証フロー

### **1. ログイン画面の配置**

```
WWWドメイン:
└── /login (一般ユーザー・管理者用)

OPSドメイン:
└── /login (運用担当者用) → ops.xxx.com/login
```

### **2. ログアウト状態時の挙動**

| ドメイン | アクセス時の挙動 | リダイレクト先 |
|---------|----------------|---------------|
| **WWW** | ✅ 自由アクセス | - |
| **APP** | ❌ 認証必須 | → `WWW/login` |
| **ADMIN** | ❌ 認証必須 | → `WWW/login` |
| **OPS** | ❌ 認証 + IP制限必須 | → `OPS/login` |

### **3. ログイン後のリダイレクト**

#### **一般ユーザー・管理者ログイン** (`/login`)
```
ログイン成功 → 権限に応じて遷移:

1. 管理者権限あり（owner/admin）→ admin.xxx.com
2. 一般ユーザー（member） → app.xxx.com

前提: 本システムでは「組織未所属ユーザー」は想定しない
  - オーナーはサインアップ時に組織を作成
  - メンバーはオーナーからの招待により所属組織が決まる
```

#### **運用担当者ログイン** (`ops.xxx.com/login`)
```
ログイン成功 → ops.xxx.com
```

### **4. 組織切り替え時の権限**

```
組織A (ADMIN) → admin.xxx.com
組織B (APP) → app.xxx.com
組織C (ADMIN) → admin.xxx.com

権限がない組織の場合:
→ 「管理者権限がありません」メッセージ → app.xxx.com
```

## 🏗️ ビジネスフロー

### **1. ユーザー登録・組織作成フロー（オーナー）**

```
1. オーナーがサインアップ（WWW）
   → 同時に組織を作成（オーナー=ownerとして登録）
2. プラン選択 → 決済情報入力（WWWのオンボーディング: payment）
3. 決済完了後、ADMINドメインへ
```

### **2. メンバー招待フロー（管理者）**

```
1. 管理者（owner/admin）がADMINからメンバー招待
2. 招待されたユーザーはメール/発行情報でログイン
3. ログイン後はAPPドメインへ（所属組織は招待で確定済み）
```

### **2. 権限の関係**

- **APP/ADMIN**: 共通アカウント、組織ベースの権限
- **OPS**: 完全に独立した権限システム

## 🛠️ 開発用設定

### **1. 認証**

```
認証:
├── メール送信なし（直接パスワード設定）
└── メール確認なし
```

### **2. 決済**

```
決済:
├── カード登録はモック
└── サブスクリプション状態は手動設定
```

## 📝 実装計画

### **実装手順**

1. **OPSドメイン内ログインページ作成** (`ops.xxx.com/login`)
   - OPS専用のデザイン
   - 運用担当者専用の認証フロー

2. **ミドルウェア更新**
   - ドメイン別の認証チェック
   - 適切なログインページへのリダイレクト

3. **権限チェック関数実装**
   - OPS権限チェック（独立）
   - ADMIN/APP権限チェック（組織ベース）

4. **ログイン後の権限別リダイレクト**
   - 権限に応じて適切なドメインへ自動遷移

5. **組織切り替え時の権限チェック**
   - 権限がない場合のメッセージ表示

6. **OPS画面でシステム全体のデータ確認機能**
   - 組織一覧・詳細
   - ユーザー一覧・詳細
   - サブスクリプション状況
   - システムログ・監査ログ

7. **招待時の権限設定機能**
   - メール送信なし（直接パスワード設定）
   - ADMIN/APP権限設定

8. **カード登録・決済をモック実装**
   - 開発用のモック決済システム

### **実装状況** ✅

| 項目 | ステータス | 実装日 | 備考 |
|------|-----------|--------|------|
| 1. OPSドメイン内ログインページ | ✅ 完了 | - | `src/app/ops/login/page.tsx` |
| 2. ミドルウェア更新 | ✅ 完了 | - | `src/middleware.ts` |
| 3. 権限チェック関数 | ✅ 完了 | - | `src/lib/auth/permissions.ts` |
| 4. ログイン後の権限別リダイレクト | ✅ 完了 | 2025-01-16 | `getRedirectUrlForUser()` |
| 5. 組織切り替え時の権限チェック | ✅ 完了 | - | `switchOrganization()` |
| 6. OPS画面でのデータ確認機能 | ✅ 完了 | - | `src/app/ops/` |
| 7. 招待時の権限設定機能 | ✅ 完了 | 2025-01-16 | 環境別実装（ローカル/Vercel） |
| 8. カード登録・決済モック | ✅ 完了 | - | `src/app/www/onboarding/payment/` |

#### **2025-01-16 実装内容**

**1. サインアップ・ログインフローの統一**
- ✅ サインアップ時に自動的に`owner`権限を付与
  - 実装場所: `src/app/actions/organization.ts:102`
  - 組織作成時に`role: 'owner'`を設定

- ✅ ログイン後は権限に応じて適切なドメインにリダイレクト
  - 実装場所: `src/app/actions/auth.ts:140`
  - `getRedirectUrlForUser(user)`を使用
  - owner/admin → ADMIN、member → APP（組織なしケースは存在しない）

- ✅ ログイン済みユーザーがWWWログインページにアクセスした場合の処理
  - 実装場所: `src/app/www/login/page.tsx`
  - Server Componentで認証チェックを実施
  - ログイン済みの場合は権限に応じたドメインに即座にリダイレクト
  - ログインフォームは`src/components/LoginForm.tsx`に分離

  
**2. オンボーディング（プラン/決済）**
- ✅ WWWのオンボーディング支払い画面でプラン選択/決済
  - 実装場所: `src/app/www/onboarding/payment/page.tsx`
  - 決済完了後にADMINへ遷移

**2. メンバー招待機能の環境別実装**
- ✅ ローカル環境: メール送信なし、パスワード固定（`password123`）
  - 実装場所: `src/app/actions/members.ts`
  - Supabase Admin APIで直接ユーザー作成
  - UIに認証情報を表示（`src/components/InviteMemberForm.tsx`）

- ✅ Vercel環境（プレビュー・本番）: メール送信あり
  - 招待URLを送信し、ユーザーが自分でパスワードを設定

**3. 権限別リダイレクトロジック**
```typescript
// src/lib/auth/permissions.ts:118-138
export async function getRedirectUrlForUser(user: User): Promise<string> {
  const permissions = await getUserPermissionLevel(user)

  // 運用担当者はOPS画面へ
  if (permissions.isOps) {
    return process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.localhost:3000'
  }

  // 管理者はADMIN画面へ
  if (permissions.isAdmin) {
    return process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'
  }

  // 一般メンバーはAPP画面へ
  if (permissions.isMember) {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
  }

  // 想定外（原則発生しない）
  // 仕様上、組織未所属ユーザーは存在しないためWWWトップへフォールバック
  return process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
}
```

## 🔧 技術実装

### **1. ミドルウェアでの認証チェック**

```typescript
// 疑似コード
if (domain === 'app' || domain === 'admin') {
  // 一般ユーザー・管理者認証チェック
  if (!user || !isValidAppUser(user)) {
    redirect('/login')
  }
}

if (domain === 'ops') {
  // 運用担当者認証チェック
  if (!user || !isOpsUser(user)) {
    redirect('/ops-login')
  }
}
```

### **2. 権限チェック関数**

```typescript
// 組織内管理者権限チェック
function hasAdminAccess(user, organizationId) {
  return user.role === 'owner' || user.role === 'admin'
}

// 運用担当者権限チェック
function isOpsUser(user) {
  return user.user_metadata?.is_ops === true
}
```

---

作成日: 2025-01-15
Next.js 15 + TypeScript + Supabase + マルチテナント
