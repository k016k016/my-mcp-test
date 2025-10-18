# 組織切り替え機能 E2Eテスト仕様書

最終更新: 2025-10-18

## 📋 概要

組織切り替え機能は、**ユーザーが複数の組織に所属している場合に、アクティブな組織を切り替える機能**です。切り替えると、表示されるデータやアクセス可能な機能が変更されます。この機能はAPPドメインとADMINドメインの両方で利用可能です。

## 🎯 テスト対象機能

### Phase 1: MVP（最小限の実装）

| 機能 | 説明 | 優先度 |
|------|------|--------|
| **組織切り替えUI表示** | 複数組織に所属している場合、ヘッダーに組織切り替えドロップダウンを表示 | 🔴 高 |
| **組織切り替え実行** | ドロップダウンから別の組織を選択して切り替え | 🔴 高 |
| **Cookie更新確認** | 切り替え時に`current_organization_id` Cookieが更新される | 🔴 高 |
| **データ表示更新** | 切り替え後、新しい組織のデータが表示される | 🔴 高 |

### Phase 2: 機能拡張（MVP後）

| 機能 | 説明 | 優先度 |
|------|------|--------|
| **権限別リダイレクト** | 切り替え先の組織での権限に応じてドメインをリダイレクト | 🟡 中 |
| **組織未所属の場合** | 組織未所属ユーザーのエラーハンドリング | 🟡 中 |

## 🧪 テストケース

---

### **1. 組織切り替えUI表示**

#### **1-1. 複数組織に所属しているユーザー**

**前提条件:**
- テストアカウント: 複数組織に所属するユーザー（手動で作成が必要）
  - 例: `multiorg@example.com` / `test1234`
  - 組織A: Owner Organization（owner権限）
  - 組織B: Admin Organization（admin権限）
- APPまたはADMINドメインにログイン済み

**操作手順:**
1. ログイン後、ヘッダーを確認

**期待結果:**
- ✅ ヘッダーに組織切り替えドロップダウンが表示される
- ✅ 現在の組織名が表示される（例: 「Owner Organization」）
- ✅ ドロップダウンをクリックすると、所属組織一覧が表示される
  - Owner Organization（owner）
  - Admin Organization（admin）
- ✅ 各組織名の横に権限バッジが表示される

#### **1-2. 1つの組織のみに所属しているユーザー**

**前提条件:**
- テストアカウント: `member@example.com` / `test1234`
- 組織: Member Organization（1つのみ）

**操作手順:**
1. ログイン後、ヘッダーを確認

**期待結果:**
- ✅ 組織切り替えドロップダウンは**表示されない**（1つのみのため）
- ✅ または、ドロップダウンは表示されるが無効化されている
- ✅ 現在の組織名のみが表示される

---

### **2. 組織切り替え実行**

#### **2-1. APPドメインでの組織切り替え**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 所属組織: Owner Organization（owner）、Admin Organization（admin）
- 現在のアクティブ組織: Owner Organization
- APPドメイン（`app.local.test:3000`）にログイン済み

**操作手順:**
1. ヘッダーの組織切り替えドロップダウンをクリック
2. 「Admin Organization」を選択

**期待結果:**
- ✅ ページがリロードされる（またはスムーズに切り替わる）
- ✅ ヘッダーの現在の組織名が「Admin Organization」に変更される
- ✅ ダッシュボードのデータが「Admin Organization」のものに更新される
- ✅ `current_organization_id` Cookieが「Admin Organization」のIDに更新される

#### **2-2. ADMINドメインでの組織切り替え**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 現在のアクティブ組織: Owner Organization
- ADMINドメイン（`admin.local.test:3000`）にログイン済み

**操作手順:**
1. ヘッダーの組織切り替えドロップダウンをクリック
2. 「Admin Organization」を選択

**期待結果:**
- ✅ ページがリロードされる
- ✅ ヘッダーの現在の組織名が「Admin Organization」に変更される
- ✅ メンバー一覧、組織設定などが「Admin Organization」のものに更新される
- ✅ `current_organization_id` Cookieが更新される

---

### **3. Cookie更新確認**

#### **3-1. 組織切り替え後のCookie確認**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 所属組織: Owner Organization、Admin Organization
- 現在のアクティブ組織: Owner Organization

**操作手順:**
1. ブラウザの開発者ツールでCookieを確認
2. `current_organization_id` Cookieの値をメモ（例: `org-123`）
3. 組織切り替えドロップダウンから「Admin Organization」を選択
4. 切り替え後、再度Cookieを確認

**期待結果:**
- ✅ `current_organization_id` Cookieの値が変更される（例: `org-456`）
- ✅ Cookieのドメインは `.local.test`（サブドメイン間で共有）
- ✅ Cookieの有効期限は適切に設定されている

---

### **4. データ表示更新**

#### **4-1. 組織切り替え後のダッシュボードデータ更新**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 所属組織:
  - Owner Organization: メンバー3人
  - Admin Organization: メンバー5人
- 現在のアクティブ組織: Owner Organization
- APPドメインのダッシュボードにアクセス済み

**操作手順:**
1. ダッシュボードで「Owner Organization」のメンバー数を確認（3人）
2. 組織切り替えドロップダウンから「Admin Organization」を選択
3. 切り替え後、ダッシュボードを確認

**期待結果:**
- ✅ ダッシュボードに表示されるメンバー数が「5人」に更新される
- ✅ 組織名が「Admin Organization」に変更される
- ✅ その他の統計情報も「Admin Organization」のものに更新される

#### **4-2. 組織切り替え後のメンバー一覧更新（ADMIN）**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 現在のアクティブ組織: Owner Organization
- ADMINドメインのメンバー管理ページにアクセス済み

**操作手順:**
1. メンバー一覧で「Owner Organization」のメンバーを確認
2. 組織切り替えドロップダウンから「Admin Organization」を選択
3. 切り替え後、メンバー一覧を確認

**期待結果:**
- ✅ メンバー一覧が「Admin Organization」のメンバーに更新される
- ✅ 「Owner Organization」のメンバーは表示されない
- ✅ ページタイトルや組織名が「Admin Organization」に変更される

---

### **5. 権限別リダイレクト（Phase 2）**

#### **5-1. admin権限の組織からmember権限の組織に切り替え**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 所属組織:
  - Admin Organization: admin権限
  - Member Organization: member権限
- 現在のアクティブ組織: Admin Organization
- ADMINドメインにログイン済み

**操作手順:**
1. ADMINドメインで組織切り替えドロップダウンをクリック
2. 「Member Organization」（member権限）を選択

**期待結果:**
- ✅ 組織が切り替わる
- ✅ member権限のため、ADMINドメインにアクセスできない
- ✅ 自動的にAPPドメイン（`app.local.test:3000`）にリダイレクトされる
- ✅ エラーメッセージ「この組織では管理者権限がありません」が表示される（オプション）

#### **5-2. member権限の組織からadmin権限の組織に切り替え**

**前提条件:**
- テストアカウント: `multiorg@example.com` / `test1234`
- 所属組織:
  - Member Organization: member権限
  - Admin Organization: admin権限
- 現在のアクティブ組織: Member Organization
- APPドメインにログイン済み

**操作手順:**
1. APPドメインで組織切り替えドロップダウンをクリック
2. 「Admin Organization」（admin権限）を選択
3. 「管理画面へ」ボタンをクリック（表示される場合）

**期待結果:**
- ✅ 組織が切り替わる
- ✅ admin権限のため、ADMINドメインにアクセス可能
- ✅ ADMINドメイン（`admin.local.test:3000`）にリダイレクトされる

---

### **6. 組織未所属の場合（Phase 2）**

#### **6-1. 組織未所属ユーザーのログイン**

**前提条件:**
- テストアカウント: `noorg@example.com` / `test1234`
- 組織: なし

**操作手順:**
1. WWWドメインでログイン

**期待結果:**
- ✅ ログインに成功する
- ✅ 組織未所属のため、オンボーディングページ（`/onboarding/create-organization`）にリダイレクトされる
- ✅ 組織作成を促すメッセージが表示される

#### **6-2. 組織未所属ユーザーがAPPドメインに直接アクセス**

**前提条件:**
- テストアカウント: `noorg@example.com` / `test1234`
- ログイン済み、組織なし

**操作手順:**
1. 直接APPドメイン（`app.local.test:3000`）にアクセス

**期待結果:**
- ✅ エラーメッセージ「組織に所属していません」が表示される
- ✅ オンボーディングページにリダイレクトされる

---

## 👤 使用するテストアカウント

| メールアドレス | パスワード | 所属組織 | 権限 | 用途 |
|--------------|----------|---------|------|------|
| `multiorg@example.com` | `test1234` | Owner Organization<br>Admin Organization | owner<br>admin | 複数組織切り替えのテスト |
| `owner@example.com` | `test1234` | Owner Organization | owner | 単一組織のテスト |
| `member@example.com` | `test1234` | Member Organization | member | 単一組織のテスト |
| `noorg@example.com` | `test1234` | なし | なし | 組織未所属のエラーケース |

**注意**: `multiorg@example.com` はテストデータ作成時に手動で複数組織に追加する必要があります。

## ⏰ 実装優先度

### **Phase 1: MVP（最優先）**

1. ✅ **組織切り替えUI表示** - ヘッダーにドロップダウン表示
2. ✅ **組織切り替え実行** - ドロップダウンから選択して切り替え
3. ✅ **Cookie更新確認** - `current_organization_id` Cookieを更新
4. ✅ **データ表示更新** - 切り替え後に新しい組織のデータを表示

### **Phase 2: 機能拡張**

5. ⏳ **権限別リダイレクト** - 切り替え先の権限に応じてドメインをリダイレクト
6. ⏳ **組織未所属の場合** - オンボーディングへのリダイレクト

### **Phase 3: UX向上**

7. ⏳ **お気に入り組織** - よく使う組織を優先表示
8. ⏳ **最近使った組織** - 最近切り替えた組織を表示
9. ⏳ **組織検索** - 所属組織が多い場合の検索機能

---

## 📝 補足事項

### **Cookieの仕様**

- **Cookie名**: `current_organization_id`
- **ドメイン**: `.local.test`（サブドメイン間で共有）
- **有効期限**: セッション期間中（またはリフレッシュトークンと同期）
- **HTTPOnly**: `true`（セキュリティ）
- **SameSite**: `lax`

### **データベース設計**

- **テーブル**: `organization_members`
- **カラム**:
  - `user_id` - ユーザーID
  - `organization_id` - 組織ID
  - `role` - 権限（owner / admin / member）
  - `created_at` - 参加日時

### **Server Actionの実装**

```typescript
// src/app/actions/organization.ts

export async function switchOrganization(organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // ユーザーが該当組織に所属しているか確認
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single()

  if (!membership) {
    return { error: '組織に所属していません' }
  }

  // Cookieを更新
  const response = NextResponse.next()
  response.cookies.set('current_organization_id', organizationId, {
    domain: '.local.test',
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  })

  return { success: true, role: membership.role }
}
```

### **UI実装のポイント**

- **ドロップダウンの位置**: ヘッダー右側、ユーザーメニューの左
- **デザイン**: 現在の組織名 + 下向き矢印アイコン
- **組織一覧**: 組織名 + 権限バッジ（owner / admin / member）
- **選択時**: ページリロードまたはスムーズなトランジション

### **エラーハンドリング**

- 組織未所属 → オンボーディングページにリダイレクト
- 権限不足（member → ADMIN） → APPドメインにリダイレクト + エラーメッセージ
- Cookie更新失敗 → エラーメッセージ + リトライボタン

---

作成日: 2025-10-18
Next.js 15 + TypeScript + Supabase + マルチテナント
