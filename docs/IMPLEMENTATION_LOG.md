# 実装ログ

このドキュメントは、プロジェクトの主要な実装内容を時系列で記録します。

---

## 2025-01-16: 認証フロー統一とリダイレクト実装

### 📌 実装の背景

サインアップからログインまでの認証フローを一貫性のあるものにし、ユーザーの権限に応じて適切なドメイン（ADMIN/APP）にリダイレクトする仕組みを実装。

### 🎯 実装内容

#### 1. サインアップ時のowner権限付与

**ファイル**: `src/app/actions/organization.ts`

```typescript
// 作成者をオーナーとして追加 (L99-103)
const { error: memberError } = await supabase.from('organization_members').insert({
  organization_id: organization.id,
  user_id: user.id,
  role: 'owner',  // 最高権限
})
```

**動作**:
- 組織作成時、自動的に作成者を`owner`権限で登録
- `owner`権限は組織内の全ての操作が可能

#### 2. ログイン後の権限別リダイレクト

**ファイル**: `src/app/actions/auth.ts`

```typescript
// ログイン成功 - ユーザーの権限に応じてリダイレクト (L140)
const redirectUrl = await getRedirectUrlForUser(user)
redirect(redirectUrl)
```

**動作**:
- ログイン成功時、`getRedirectUrlForUser()`で適切なドメインを判定
- OPS権限 → OPS、管理者 → ADMIN、一般メンバー → APP、組織なし → オンボーディング

#### 3. ログイン済みユーザーのWWWログインページ対応

**ファイル**:
- `src/app/www/login/page.tsx` (Server Component)
- `src/components/LoginForm.tsx` (Client Component)

```typescript
// src/app/www/login/page.tsx
export default async function LoginPage() {
  const supabase = await createClient()

  // 既にログインしているかチェック
  const { data: { user } } = await supabase.auth.getUser()

  // ログイン済みの場合は権限に応じたページにリダイレクト
  if (user) {
    const redirectUrl = await getRedirectUrlForUser(user)
    redirect(redirectUrl)
  }

  // 未ログインの場合はログインフォームを表示
  return <LoginForm />
}
```

**動作**:
- ログイン済みユーザーがWWWログインページにアクセスした場合、即座に適切なドメインにリダイレクト
- ログインフォームは表示されない
- フォーム部分は`LoginForm.tsx`に分離してClient Component化

#### 4. 組織作成後のリダイレクト先変更

**ファイル**: `src/app/www/onboarding/create-organization/page.tsx`

```typescript
// 変更前 (L73)
window.location.href = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

// 変更後 (L73)
// 成功時はADMINドメインへリダイレクト（owner権限のため）
window.location.href = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000'
```

**理由**:
- サインアップ直後のユーザーは`owner`権限を持つ
- 組織作成後の典型的なタスクは管理業務（メンバー招待、設定など）
- ログインや組織切り替えでも管理者はADMINに遷移するため、一貫性が保たれる

#### 5. メンバー招待機能の環境別実装（前回実装の記録）

**ファイル**:
- `src/app/actions/members.ts`
- `src/components/InviteMemberForm.tsx`

**ローカル環境**:
```typescript
const isLocal = !process.env.VERCEL && process.env.NODE_ENV === 'development'

if (isLocal) {
  // Supabase Admin APIで直接ユーザー作成
  const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
    email: validatedData.email,
    password: 'password123',  // 固定パスワード
    email_confirm: true,
  })

  // 認証情報をレスポンスで返す
  return {
    success: true,
    credentials: { email: validatedData.email, password: 'password123' }
  }
}
```

**Vercel環境（プレビュー・本番）**:
```typescript
else {
  // 招待URLを生成してメール送信
  await sendInvitationEmail(...)
  return { success: true, invitation }
}
```

**UIの変更**:
- ローカル環境では、成功メッセージに認証情報（メール・パスワード）を表示
- 「確認しました」ボタンでメッセージを閉じる

### 🔄 認証フロー全体像

```
サインアップフロー:
1. WWW/signup → アカウント作成
2. WWW/onboarding/create-organization → 組織作成（owner権限付与）
3. ADMIN → 管理画面（メンバー招待などの管理タスク）

ログインフロー:
1. WWW/login → 認証
2. 権限チェック → owner/admin権限の場合
3. ADMIN → 管理画面

ログイン中にWWW/loginにアクセス:
1. Server Componentで認証チェック
2. 権限に応じて即座にリダイレクト（フォーム非表示）
```

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/app/www/login/page.tsx` | Server Componentに変更、ログイン済みチェック追加 | 変更 |
| `src/components/LoginForm.tsx` | ログインフォームをClient Componentとして分離 | 新規 |
| `src/app/www/onboarding/create-organization/page.tsx` | リダイレクト先をAPP→ADMINに変更 | 変更 |
| `src/app/actions/members.ts` | 環境別招待処理（前回実装） | 変更 |
| `src/components/InviteMemberForm.tsx` | 認証情報表示UI（前回実装） | 変更 |
| `docs/specifications/AUTH_FLOW_SPECIFICATION.md` | 実装状況を追記 | 更新 |

### ✅ テスト項目

- [ ] サインアップ → 組織作成 → ADMINドメインに遷移
- [ ] ログイン → 管理者権限 → ADMINドメインに遷移
- [ ] ログイン → 一般メンバー → APPドメインに遷移
- [ ] ログイン済み状態でWWW/loginにアクセス → 即座にリダイレクト
- [ ] ローカル環境でメンバー招待 → パスワード表示
- [ ] Vercel環境でメンバー招待 → メール送信

### 🔗 関連リンク

- 仕様書: `docs/specifications/AUTH_FLOW_SPECIFICATION.md`
- 権限チェック関数: `src/lib/auth/permissions.ts`
- 認証Action: `src/app/actions/auth.ts`

---

## 2025-01-16: セッション監視機能の実装（別ウィンドウログアウト対応）

### 📌 実装の背景

マルチドメイン構成（ADMIN/APP/OPS）において、別のブラウザタブやウィンドウでログアウトした場合、他のタブでは画面が更新されず、ログアウト済みにも関わらず画面が表示され続ける問題が発生していました。

**問題の詳細**：
1. Server Componentでの認証チェックはページロード時のみ実行
2. 別タブでログアウトしても、既に開いているタブのServer Componentは再実行されない
3. ログアウト済みなのに画面が表示され続け、Server Actionを実行すると認証エラーになる

### 🎯 実装内容

#### 1. SessionMonitorコンポーネントの作成

**ファイル**: `src/components/SessionMonitor.tsx`

```typescript
'use client'

export default function SessionMonitor({ redirectTo }: SessionMonitorProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // ログアウトイベントを検知
      if (event === 'SIGNED_OUT') {
        console.log('[SessionMonitor] ログアウトを検知しました。リダイレクトします...')

        const targetUrl = redirectTo || `${process.env.NEXT_PUBLIC_WWW_URL}/login`
        router.refresh()
        window.location.href = targetUrl
      }

      // セッション期限切れも検知
      if (event === 'TOKEN_REFRESHED' && !session) {
        const targetUrl = redirectTo || `${process.env.NEXT_PUBLIC_WWW_URL}/login`
        window.location.href = targetUrl
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [redirectTo, router])

  return null // UIを持たない監視専用コンポーネント
}
```

**機能**：
- Supabaseの`onAuthStateChange`でセッション状態をリアルタイム監視
- `SIGNED_OUT`イベント（ログアウト）を検知したら自動リダイレクト
- `TOKEN_REFRESHED`イベントでセッション期限切れも検知
- `redirectTo`プロップでドメイン別のリダイレクト先を指定可能

#### 2. 各ドメインのレイアウトに追加

**ADMINドメイン** (`src/app/admin/layout.tsx`):
```tsx
import SessionMonitor from '@/components/SessionMonitor'

return (
  <div>
    <SessionMonitor />
    {/* ... */}
  </div>
)
```

**APPドメイン** (`src/app/app/layout.tsx`):
```tsx
import SessionMonitor from '@/components/SessionMonitor'

return (
  <div>
    <SessionMonitor />
    {/* ... */}
  </div>
)
```

**OPSドメイン** (`src/app/ops/layout.tsx`):
```tsx
import SessionMonitor from '@/components/SessionMonitor'

return (
  <div>
    <SessionMonitor redirectTo={`${process.env.NEXT_PUBLIC_OPS_URL}/login`} />
    {/* ... */}
  </div>
)
```

**動作**：
- ADMIN/APPドメイン: ログアウト検知時にWWWログインページ（`http://localhost:3000/login`）にリダイレクト
- OPSドメイン: ログアウト検知時にOPSログインページ（`http://ops.localhost:3000/login`）にリダイレクト

### 🔄 動作フロー

```
シナリオ: 別ウィンドウでログアウト

1. ユーザーがブラウザでADMIN画面を開いている（タブA）
2. 別のタブ（タブB）を開いてログアウトを実行
3. タブBでSupabaseセッションが削除される
4. タブAのSessionMonitorが`SIGNED_OUT`イベントを検知
5. タブAが自動的にWWWログインページにリダイレクト

結果: ログアウト済みの状態で画面が表示され続けることを防止
```

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/components/SessionMonitor.tsx` | セッション監視コンポーネント | 新規 |
| `src/app/admin/layout.tsx` | SessionMonitor追加 | 変更 |
| `src/app/app/layout.tsx` | SessionMonitor追加 | 変更 |
| `src/app/ops/layout.tsx` | SessionMonitor追加 | 変更 |

### ✅ テスト項目

- [ ] ADMIN画面を開いた状態で別タブでログアウト → 自動でWWWログインページにリダイレクト
- [ ] APP画面を開いた状態で別タブでログアウト → 自動でWWWログインページにリダイレクト
- [ ] OPS画面を開いた状態で別タブでログアウト → 自動でOPSログインページにリダイレクト
- [ ] セッション期限切れ時も同様にリダイレクト
- [ ] 複数タブを開いている場合、全てのタブで同時にリダイレクト

### 🔗 関連リンク

- Supabase認証イベント: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- SessionMonitorコンポーネント: `src/components/SessionMonitor.tsx`

---

## 2025-01-16: セッション監視とドメイン設定の改善

### 📌 実装の背景

1. **別ウィンドウでのログアウト問題**: 複数タブを開いている状態で1つのタブでログアウトしても、他のタブには反映されない
2. **オンボーディングリダイレクトエラー**: `/onboarding`にリダイレクトすると404エラー
3. **local.testドメインの重要性**: サブドメイン間のCookie共有に必須だが、ドキュメントが不足

### 🎯 実装内容

#### 1. SessionMonitorコンポーネントの実装

**ファイル**: `src/components/SessionMonitor.tsx`

```typescript
export default function SessionMonitor({ redirectTo }: SessionMonitorProps) {
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // リダイレクト中フラグを設定（二重リダイレクト防止）
        sessionStorage.setItem('logout-redirecting', 'true')
        const targetUrl = redirectTo || `${process.env.NEXT_PUBLIC_WWW_URL}/login`
        window.location.href = targetUrl
      }
    })

    return () => subscription.unsubscribe()
  }, [redirectTo, router])
}
```

**機能**:
- Supabaseの`onAuthStateChange`でセッション状態を監視
- `SIGNED_OUT`イベントを検知したら自動リダイレクト
- 各ドメインのlayoutに配置

**配置箇所**:
- `src/app/admin/layout.tsx`
- `src/app/app/layout.tsx`
- `src/app/ops/layout.tsx`

#### 2. オンボーディングリダイレクトの修正

**問題**: `/onboarding`ディレクトリに`page.tsx`が存在せず404エラー

**修正**: `src/lib/auth/permissions.ts`

```typescript
// 修正前
return `${process.env.NEXT_PUBLIC_WWW_URL}/onboarding`

// 修正後
return `${process.env.NEXT_PUBLIC_WWW_URL}/onboarding/create-organization`
```

**影響範囲**:
- `src/lib/auth/permissions.ts`
- `src/lib/auth/__tests__/permissions.test.ts`
- `src/app/actions/__tests__/auth.test.ts`
- `docs/specifications/AUTH_FLOW_SPECIFICATION.md`

#### 3. local.testドメイン設定のドキュメント化

**ファイル**: `docs/specifications/MULTI_DOMAIN_SETUP.md`, `CLAUDE.md`

**追加内容**:
- hostsファイル設定の重要性を強調
- `.local.test`ドメインが必須である理由を説明
- Cookie共有の仕組みを明記

**hostsファイル設定**:
```bash
127.0.0.1 local.test
127.0.0.1 www.local.test
127.0.0.1 app.local.test
127.0.0.1 admin.local.test
127.0.0.1 ops.local.test
```

**なぜ`.local.test`が必要か**:
- `localhost`ではサブドメイン間のCookie共有ができない（ブラウザの制限）
- 環境変数`NEXT_PUBLIC_COOKIE_DOMAIN=.local.test`と連携

#### 4. LogoutButtonとSessionMonitorの競合対策（部分的）

**問題**: 複数タブで連続してログアウトすると"Failed to fetch"エラー

**試みた対策**:
- sessionStorageでリダイレクト中フラグを管理
- LogoutButtonでフラグをチェック
- LoginFormでフラグをクリア

**状態**: エラーは解決せず、今後の課題として残る

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/components/SessionMonitor.tsx` | セッション監視コンポーネント | 新規 |
| `src/app/admin/layout.tsx` | SessionMonitor追加 | 変更 |
| `src/app/app/layout.tsx` | SessionMonitor追加 | 変更 |
| `src/app/ops/layout.tsx` | SessionMonitor追加 | 変更 |
| `src/lib/auth/permissions.ts` | オンボーディングパス修正 | 変更 |
| `src/lib/auth/__tests__/permissions.test.ts` | テスト更新 | 変更 |
| `src/app/actions/__tests__/auth.test.ts` | テスト更新 | 変更 |
| `docs/specifications/MULTI_DOMAIN_SETUP.md` | local.test設定を詳細化 | 変更 |
| `CLAUDE.md` | 開発環境セットアップ手順を更新 | 変更 |
| `src/components/LogoutButton.tsx` | リダイレクトロジック変更 | 変更 |
| `src/components/LoginForm.tsx` | フラグクリア処理追加 | 変更 |

### ✅ 完了項目

- [x] SessionMonitorコンポーネント実装
- [x] 各ドメインlayoutにSessionMonitor配置
- [x] オンボーディングリダイレクト修正
- [x] テストコード更新
- [x] local.testドメインのドキュメント化

### ⚠️ 既知の問題

- **複数タブでの連続ログアウトエラー**: SessionMonitorとLogoutButtonの競合により"Failed to fetch"エラーが発生する場合がある（影響は軽微、リダイレクト自体は成功する）

### 🎯 次のステップ

1. サインアップの流れを完成させる（権限はadmin）
2. adminでユーザを追加できる。権限も設定可能
3. adminでユーザを削除・変更できる。（論理削除）

### 🔗 関連リンク

- SessionMonitor実装: `src/components/SessionMonitor.tsx`
- マルチドメイン設定: `docs/specifications/MULTI_DOMAIN_SETUP.md`
- 認証フロー仕様: `docs/specifications/AUTH_FLOW_SPECIFICATION.md`

---

## 2025-01-17: サインアップフロー完成とメンバー管理機能の実装

### 📌 実装の背景

PROJECT_PROGRESS.mdに記載されていた次のステップを実装：
1. サインアップの流れを完成させる（権限はadmin）
2. adminでユーザを追加できる。権限も設定可能
3. adminでユーザを削除・変更できる。（論理削除）

### 🎯 実装内容

#### 1. サインアップ時の組織自動作成

**ファイル**: `src/app/actions/auth.ts`

**変更内容**:
サインアップ成功後、会社名を使って自動的に組織を作成し、ユーザーを`owner`として追加

```typescript
// サインアップ成功後、自動的に組織を作成
const slug = companyName
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]/g, '')
  .replace(/--+/g, '-')
  .substring(0, 50)

const uniqueSlug = `${slug}-${Date.now()}`

// 組織を作成
const { data: organization } = await supabase
  .from('organizations')
  .insert({
    name: companyName,
    slug: uniqueSlug,
    subscription_plan: 'free',
    subscription_status: 'trialing',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  })
  .select()
  .single()

// ユーザーをownerとして組織に追加
await supabase.from('organization_members').insert({
  organization_id: organization.id,
  user_id: data.user.id,
  role: 'owner',
})
```

**動作**:
- 会社名から一意なslugを生成（タイムスタンプ付き）
- 組織を作成し、14日間のトライアル期間を設定
- ユーザーを`owner`として組織に追加
- `/onboarding/create-organization`をスキップして直接ADMIN画面へ

**リダイレクト先の変更** (`src/app/www/signup/page.tsx`):
```typescript
// メール確認不要の場合はADMIN画面へ（組織は自動作成済み、ownerとして追加済み）
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.local.test:3000'
window.location.href = adminUrl
```

#### 2. Admin画面のメンバー管理機能

**新規ページ**: `src/app/admin/members/page.tsx`

**実装内容**:
- メンバー一覧の表示（削除済みメンバーを除外）
- `InviteMemberForm`コンポーネントの配置
- ロール別のバッジ表示（オーナー/管理者/メンバー）
- アバター表示

```typescript
// 組織のメンバー一覧を取得（削除済みを除外）
const { data: members } = await supabase
  .from('organization_members')
  .select(`
    id,
    role,
    created_at,
    profile:profiles (id, email, full_name, name)
  `)
  .eq('organization_id', organizationId)
  .is('deleted_at', null)  // 論理削除済みを除外
  .order('created_at', { ascending: false })
```

**ナビゲーションの追加** (`src/app/admin/layout.tsx`):
- サイドバーに「メンバー管理」リンクを追加（`/members`）

#### 3. 論理削除（ソフトデリート）の実装

**マイグレーション**: `supabase/migrations/20250117000001_add_soft_delete.sql`

```sql
-- organization_membersテーブルにdeleted_atカラムを追加
ALTER TABLE organization_members
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- profilesテーブルにもdeleted_atカラムを追加（将来のため）
ALTER TABLE profiles
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- deleted_atが設定されているレコードを除外するためのインデックス
CREATE INDEX idx_organization_members_deleted_at
ON organization_members(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_profiles_deleted_at
ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
```

**型定義の更新** (`src/types/database.ts`):
```typescript
export interface Profile {
  // ... 既存フィールド
  deleted_at: string | null
}

export interface OrganizationMember {
  // ... 既存フィールド
  deleted_at: string | null
}
```

**Server Actionsの更新** (`src/app/actions/members.ts`):

削除処理を物理削除から論理削除に変更：
```typescript
// 修正前
const { error: deleteError } = await supabase
  .from('organization_members')
  .delete()
  .eq('id', memberId)

// 修正後
const { error: deleteError } = await supabase
  .from('organization_members')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', memberId)
```

全てのクエリに削除済み除外条件を追加：
```typescript
.is('deleted_at', null)
```

適用箇所：
- `inviteMember()` - 権限チェック時
- `updateMemberRole()` - 権限チェックと対象メンバー取得時
- `removeMember()` - 対象メンバー取得と権限チェック時
- `src/app/admin/members/page.tsx` - メンバー一覧取得時

#### 4. メンバー編集・削除UI

**新規コンポーネント**: `src/components/MemberActions.tsx`

**機能**:
- ロール変更ドロップダウン（owner以外）
- 削除ボタン（owner以外）
- 削除確認モーダル
- ローディング状態の表示

```typescript
export default function MemberActions({
  memberId,
  organizationId,
  currentRole,
  isCurrentUser,
  isOwner,
}: MemberActionsProps) {
  const handleRoleChange = async (newRole: OrganizationRole) => {
    const result = await updateMemberRole(organizationId, memberId, newRole)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  const handleDelete = async () => {
    const result = await removeMember(organizationId, memberId)
    if (!result.error) {
      router.refresh()
    }
  }
  // ...
}
```

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/app/actions/auth.ts` | サインアップ時に組織自動作成ロジックを追加 | 変更 |
| `src/app/www/signup/page.tsx` | サインアップ後のリダイレクト先をADMINに変更 | 変更 |
| `src/app/admin/members/page.tsx` | メンバー管理ページ | 新規 |
| `src/app/admin/layout.tsx` | ナビゲーションに「メンバー管理」追加 | 変更 |
| `src/components/MemberActions.tsx` | メンバーアクションコンポーネント | 新規 |
| `supabase/migrations/20250117000001_add_soft_delete.sql` | 論理削除用マイグレーション | 新規 |
| `src/types/database.ts` | deleted_atフィールド追加 | 変更 |
| `src/app/actions/members.ts` | 論理削除に変更、削除済み除外条件追加 | 変更 |

### ✅ テスト項目

- [ ] サインアップ → 組織自動作成 → ADMIN画面に遷移
- [ ] サインアップ後、組織にowner権限で追加されている
- [ ] Admin画面のメンバー管理ページで一覧表示
- [ ] メンバー招待が機能する（権限設定可能）
- [ ] メンバーのロール変更が機能する
- [ ] メンバー削除が論理削除として機能する（deleted_atが設定される）
- [ ] 削除済みメンバーが一覧に表示されない
- [ ] オーナーのロール変更・削除ができない

### 🔄 フロー全体像

```
サインアップから管理画面までの完全なフロー:

1. WWW/signup
   ↓
2. ユーザー作成
   ↓
3. 会社名から組織を自動作成（owner権限）
   ↓
4. ADMIN画面に自動リダイレクト
   ↓
5. メンバー管理ページでメンバー招待
   ↓
6. メンバーのロール変更・削除（論理削除）
```

### 🎯 完了した機能

1. ✅ サインアップの流れを完成させる（権限はadmin → owner）
2. ✅ adminでユーザを追加できる（権限も設定可能）
3. ✅ adminでユーザを削除・変更できる（論理削除）

### 🔗 関連リンク

- メンバー管理ページ: `src/app/admin/members/page.tsx`
- メンバーActions: `src/app/actions/members.ts`
- 論理削除マイグレーション: `supabase/migrations/20250117000001_add_soft_delete.sql`
- 認証フロー仕様: `docs/specifications/AUTH_FLOW_SPECIFICATION.md`

---

## 2025-01-17: APP/ADMIN/OPSドメインの役割分離とUI刷新

### 📌 実装の背景

APPとADMINドメインの役割が曖昧で、機能が重複していた問題を解決するため、各ドメインの責務を明確に分離しました。また、UIの視認性の問題（白背景に白文字など）も同時に修正しました。

**問題点**:
- APPドメインに組織管理機能があり、ADMINドメインっぽい
- ADMINドメインにシステム全体の統計があり、OPSドメインの機能が混在
- 白背景に白文字、黒背景に黒文字で見えない箇所が存在

**目指すアーキテクチャ**:
- **APP**: 一般ユーザー向けのシンプルなダッシュボードと個人設定のみ
- **ADMIN**: 組織管理者向けの組織管理機能（メンバー、設定、サブスクリプション）
- **OPS**: システム管理者向けの全組織・全ユーザー管理（既存のまま）

### 🎯 実装内容

#### 1. APPドメインの簡素化

**削除したディレクトリ**:
- `src/app/app/settings/members/` - メンバー管理（ADMIN機能）
- `src/app/app/settings/organization/` - 組織設定（ADMIN機能）
- `src/app/app/settings/subscription/` - サブスクリプション管理（ADMIN機能）

**ファイル**: `src/app/app/page.tsx`

```typescript
// シンプルなユーザーダッシュボードに変更
// ウェルカムカード
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  {/* あなたの組織 */}
  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900">あなたの組織</h3>
    <p className="text-3xl font-bold text-gray-900 mb-2">{currentOrg.name}</p>
    <p className="text-sm text-gray-600">プラン: {currentOrg.subscription_plan}</p>
  </div>

  {/* あなたのロール */}
  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900">あなたのロール</h3>
    <p className="text-3xl font-bold text-gray-900 mb-2">
      {currentMembership.role === 'owner' ? 'オーナー' :
       currentMembership.role === 'admin' ? '管理者' : 'ユーザー'}
    </p>
  </div>

  {/* クイックアクション */}
  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
    <a href="/settings/profile">→ プロフィール設定</a>
    {(role === 'owner' || role === 'admin') && (
      <a href={ADMIN_URL}>→ 管理画面へ</a>
    )}
  </div>
</div>
```

**変更点**:
- 複雑なプロジェクト・タスク表示を削除
- シンプルな3カードレイアウトに変更
- 明るく親しみやすいデザイン（白背景、視認性の高い文字色）
- trial_ends_atへの参照を削除

#### 2. ADMINドメインの再構成

**削除したファイル**:
- `src/app/admin/organizations/page.tsx` - 全組織一覧（OPS機能）
- `src/app/admin/users/page.tsx` - 全ユーザー一覧（OPS機能）

**ファイル**: `src/app/admin/page.tsx`

変更前: システム全体の統計（全ユーザー数、全組織数）
```typescript
// 全ユーザー数を取得
const { count: totalUsers } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })

// 全組織数を取得
const { count: totalOrganizations } = await supabase
  .from('organizations')
  .select('*', { count: 'exact', head: true })
```

変更後: 自組織のみの統計
```typescript
// 現在の組織IDを取得
const organizationId = await getCurrentOrganizationId()

// 自組織のメンバー数を取得
const { count: membersCount } = await supabase
  .from('organization_members')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', organizationId)
  .is('deleted_at', null)

// 自組織の最近のメンバーを取得
const { data: recentMembers } = await supabase
  .from('organization_members')
  .select('...')
  .eq('organization_id', organizationId)
  .is('deleted_at', null)
```

**新規ページ**: `src/app/admin/settings/page.tsx`

組織設定ページを作成:
```typescript
export default async function OrganizationSettingsPage() {
  // 権限チェック（オーナーまたは管理者）
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  return <OrganizationSettingsForm organization={organization} />
}
```

**新規コンポーネント**: `src/components/OrganizationSettingsForm.tsx`

組織名とスラッグの編集機能:
```typescript
export default function OrganizationSettingsForm({ organization }) {
  async function handleSubmit(e: React.FormEvent) {
    const result = await updateOrganization(organization.id, formData)
    // ...
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={slug} onChange={(e) => setSlug(e.target.value)} />
      <button type="submit">変更を保存</button>
    </form>
  )
}
```

**新規ページ**: `src/app/admin/subscription/page.tsx`

サブスクリプション管理ページ:
```typescript
export default async function SubscriptionPage() {
  // 権限チェック（オーナーのみ）
  const isOwner = currentMember?.role === 'owner'

  // 使用量制限と現在の使用量を取得
  const { data: usageLimit } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('plan', organization?.subscription_plan || 'free')

  const { count: membersCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // プラン一覧とアップグレードボタンを表示
  return (
    <div>
      <SubscriptionCard organization={organization} />
      {/* 使用量の詳細 */}
      {/* 利用可能なプラン（Free/Standard/Enterprise） */}
    </div>
  )
}
```

#### 3. プロフィールページの拡張

**ファイル**: `src/app/app/settings/profile/page.tsx`

**追加機能1: パスワード変更**
```typescript
async function handlePasswordChange(e: React.FormEvent) {
  // バリデーション
  if (newPassword !== confirmPassword) {
    setPasswordMessage({ type: 'error', text: '新しいパスワードが一致しません' })
    return
  }

  if (newPassword.length < 8) {
    setPasswordMessage({ type: 'error', text: 'パスワードは8文字以上にしてください' })
    return
  }

  // Supabaseのパスワード変更
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (!error) {
    setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' })
  }
}
```

**追加機能2: 組織と権限の表示**
```typescript
async function loadOrganizations() {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (id, name)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  setOrganizations(memberships)
}

// UI表示
{organizations.map((membership) => (
  <div key={membership.organization.id}>
    <h3>{membership.organization.name}</h3>
    <span className={getRoleBadgeColor(membership.role)}>
      {getRoleLabel(membership.role)}
    </span>
  </div>
))}
```

**UIの改善**:
- 3つのセクションに分割（基本情報、パスワード変更、組織と権限）
- 視認性の高い配色（白背景にグレー/ブラック文字）
- グラデーションボタンでアクセントを追加

#### 4. 視認性の改善

既存のコンポーネントで視認性の問題を修正（前回実装済み）:

**ファイル**: `src/components/InviteMemberForm.tsx`
```typescript
// 変更前: 背景色なし（継承により白背景に白文字になる可能性）
<div className="rounded-lg shadow p-6">

// 変更後: 明示的に背景と文字色を指定
<div className="bg-white text-gray-900 rounded-lg shadow p-6">
```

**ファイル**: `src/components/MemberActions.tsx`
```typescript
// 変更前: text-gray-400（薄くて見えにくい）
className="text-gray-400"

// 変更後: text-gray-600（視認性向上）
className="text-gray-600"

// ドロップダウンにも明示的な色指定
className="text-gray-900 text-sm border border-gray-300 rounded px-2 py-1..."
```

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/app/app/settings/members/` | ディレクトリ削除（ADMIN機能のため） | 削除 |
| `src/app/app/settings/organization/` | ディレクトリ削除（ADMIN機能のため） | 削除 |
| `src/app/app/settings/subscription/` | ディレクトリ削除（ADMIN機能のため） | 削除 |
| `src/app/app/page.tsx` | シンプルなユーザーダッシュボードに変更 | 変更 |
| `src/app/admin/organizations/page.tsx` | 削除（OPS機能のため） | 削除 |
| `src/app/admin/users/page.tsx` | 削除（OPS機能のため） | 削除 |
| `src/app/admin/page.tsx` | システム全体統計→自組織統計に変更 | 変更 |
| `src/app/admin/settings/page.tsx` | 組織設定ページ | 新規 |
| `src/components/OrganizationSettingsForm.tsx` | 組織設定フォームコンポーネント | 新規 |
| `src/app/admin/subscription/page.tsx` | サブスクリプション管理ページ | 新規 |
| `src/app/app/settings/profile/page.tsx` | パスワード変更と権限表示を追加 | 変更 |

### 🎨 ドメイン別デザイン方針

| ドメイン | 対象ユーザー | デザインコンセプト | 配色 |
|---------|------------|-----------------|------|
| **APP** | 一般ユーザー | シンプル、親しみやすい、明るい | 白背景、明るいグラデーション |
| **ADMIN** | 組織管理者 | プロフェッショナル、ビジネスライク | 白/グレー背景、統一感のあるカラー |
| **OPS** | システム管理者 | ターミナル風、技術的 | ダークモード（既存のまま） |

### ✅ テスト項目

- [x] APPダッシュボードがシンプルなカードレイアウトで表示される
- [x] APPから組織管理機能が削除されている
- [x] ADMINダッシュボードに自組織の統計が表示される
- [x] ADMIN設定ページで組織情報を編集できる
- [x] ADMINサブスクリプションページで使用量とプランが確認できる
- [x] プロフィールページでパスワードが変更できる
- [x] プロフィールページで所属組織と権限が表示される
- [x] 視認性の問題（白背景白文字）が修正されている

### 🔄 ドメイン役割の整理

```
【APP】一般ユーザー向け
- ダッシュボード（組織情報、ロール表示、クイックアクション）
- プロフィール設定（個人情報、パスワード変更、権限確認）
- ※組織管理機能なし

【ADMIN】組織管理者向け（owner/admin権限）
- ダッシュボード（自組織の統計）
- メンバー管理（招待、ロール変更、削除）
- 組織設定（組織名、スラッグ編集）
- サブスクリプション管理（プラン、使用量）
- ※自組織のみ管理可能

【OPS】システム管理者向け（is_ops: true）
- 全組織一覧
- 全ユーザー一覧
- システム全体の管理
- ※既存機能そのまま
```

### 🔗 関連リンク

- ドメインアーキテクチャ仕様: `docs/specifications/DOMAIN_ARCHITECTURE_SPECIFICATION.md`（新規作成予定）
- マルチドメイン設定: `docs/specifications/MULTI_DOMAIN_SETUP.md`

---

## テンプレート（次回の実装記録用）

```markdown
## YYYY-MM-DD: [実装内容のタイトル]

### 📌 実装の背景
[なぜこの実装が必要だったか]

### 🎯 実装内容
[具体的な実装内容]

### 📁 変更ファイル一覧
| ファイル | 変更内容 | タイプ |
|---------|---------|--------|

### ✅ テスト項目
- [ ] テスト項目1
- [ ] テスト項目2

### 🔗 関連リンク
- 関連ドキュメント
```
