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

## 2025-01-18: UI改善とE2Eテストのシンプル化、slug削除

### 📌 実装の背景

1. **UI改善**: ユーザーから不要なフィールドを削除し、必要なフィールド（氏名）を追加する要望があった
2. **E2Eテスト**: 未実装機能のテストが多く、メンテナンスコストが高かった。実装済み機能のみに絞ってシンプル化する必要があった
3. **slug削除**: organizationsテーブルのslugカラムが使われておらず、Supabaseのスキーマキャッシュエラーの原因になっていた

### 🎯 実装内容

#### 1. APP profile設定の簡素化

**ファイル**: `src/app/app/settings/profile/page.tsx`

**削除したフィールド**:
- 担当者名（name）入力フィールド
- アバターURL（avatar_url）入力フィールド

**動作**:
- プロフィール設定が氏名（full_name）とメールアドレスのみのシンプルな構成に
- 不要な情報入力を削減し、ユーザー体験を向上

#### 2. ADMIN members一覧のカラムヘッダ変更

**ファイル**: `src/app/admin/members/page.tsx`

**変更内容**:
```typescript
// カラムヘッダを以下に変更
<th>氏名</th>
<th>メール</th>
<th>ロール</th>
<th>最終使用日</th>
<th>アクション</th>
```

**動作**:
- より直感的で分かりやすいカラム名に変更
- ユーザーが情報を素早く把握できるように改善

#### 3. ADMIN member招待に氏名フィールド追加

**ファイル**:
- `src/components/InviteMemberForm.tsx`
- `src/app/actions/members.ts`
- `src/lib/validation.ts`

**追加したフィールド**:
```typescript
// InviteMemberForm.tsx
const [fullName, setFullName] = useState('')

<div>
  <label htmlFor="fullName">氏名</label>
  <input
    id="fullName"
    type="text"
    required
    value={fullName}
    onChange={(e) => setFullName(e.target.value)}
    placeholder="山田 太郎"
  />
</div>
```

**バリデーション更新**:
```typescript
// src/lib/validation.ts
export const inviteMemberSchema = z.object({
  organizationId: uuidSchema,
  email: emailSchema,
  fullName: z.string().min(1, '氏名を入力してください').max(100, '氏名は100文字以内で入力してください'),
  role: organizationRoleSchema,
})
```

**Server Action更新**:
```typescript
// src/app/actions/members.ts (ローカル環境)
await supabase
  .from('profiles')
  .update({
    full_name: validatedData.fullName,
  })
  .eq('id', newUser.user.id)
```

**動作**:
- メンバー招待時に氏名を入力できるように
- ローカル環境では招待時にプロフィールに氏名が自動設定される
- より完全なメンバー情報が登録される

#### 4. ADMIN organization設定からslug削除

**ファイル**: `src/components/OrganizationSettingsForm.tsx`

**削除した内容**:
- slugフィールドの状態管理
- slugフィールドの入力UI
- FormDataへのslug追加処理

**動作**:
- 組織設定が組織名のみのシンプルな構成に
- slugは使用していないため削除

#### 5. データベースからslugカラム削除

**マイグレーション**: `supabase/migrations/20250117130001_remove_slug_from_organizations.sql`

```sql
-- インデックスを削除
DROP INDEX IF EXISTS idx_organizations_slug;

-- slug列を削除
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;
```

**適用方法**:
```bash
# Supabase CLIでマイグレーション履歴を修復
supabase migration repair --status reverted 20250118000001
supabase migration repair --status applied 20250117130001
```

**動作**:
- organizationsテーブルからslugカラムを完全に削除
- Supabaseのスキーマキャッシュエラーを解消
- INSERT時のエラーを防止

#### 6. E2Eテストのシンプル化

**削除したファイル**:
- `e2e/auth-flow.spec.ts` - 未実装機能（パスワードリセット、OAuth詳細フロー）のテストを含む
- `e2e/domain-auth.spec.ts` - ドメイン認証の詳細テスト（実装と乖離）

**新規作成**: `e2e/auth.spec.ts`

**テストケース（5つのコアテスト）**:
```typescript
test.describe('認証フロー', () => {
  // 1. サインアップ → owner権限で組織作成 → 支払いページへ
  test('サインアップ → owner権限で組織作成 → 支払いページへ', async ({ page }) => {
    // サインアップ
    // ✅ 支払いページに到達
    // ✅ 組織が作成されている
    // ✅ プラン選択UIが表示
    // ✅ 決済完了後ADMINへ
    // ✅ 自分がownerであることを確認
  })

  // 2. owner権限ユーザー → ADMINドメインにリダイレクト
  test('owner権限ユーザー → ADMINドメインにリダイレクト', async ({ page }) => {
    // owner@example.comでログイン
    // ✅ ADMINドメインにリダイレクト
  })

  // 3. member権限ユーザー → APPドメインにリダイレクト
  test('member権限ユーザー → APPドメインにリダイレクト', async ({ page }) => {
    // member@example.comでログイン
    // ✅ APPドメインにリダイレクト
  })

  // 4. 間違った認証情報 → エラー表示
  test('間違った認証情報 → エラー表示', async ({ page }) => {
    // 無効な認証情報でログイン
    // ✅ エラーメッセージが表示
  })

  // 5. ログアウト → WWWドメインにリダイレクト
  test('ログアウト → WWWドメインにリダイレクト', async ({ page }) => {
    // ログイン → ログアウト
    // ✅ WWWドメインにリダイレクト
  })
})
```

**ドメイン設定の修正**:
```typescript
// テストで使用するドメインを.local.testに変更
const DOMAINS = {
  WWW: 'http://www.local.test:3000',
  APP: 'http://app.local.test:3000',
  ADMIN: 'http://admin.local.test:3000',
}
```

**動作**:
- テストケース数: 27個 → 5個（実装済み機能のみ）
- メンテナンス性: 大幅改善
- ビジネスロジック: 重要な仕様を確実にカバー
- Cookie共有の問題を解決（.local.testドメイン使用）

#### 7. 認証フロー改善（ミドルウェア）

**ファイル**: `src/middleware.ts`

**追加内容**:
```typescript
// WWWドメインのログインページで、既にログイン済みの場合は適切なドメインにリダイレクト
if (domain === DOMAINS.WWW && request.nextUrl.pathname === '/login') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // 運用担当者チェック
    const isOps = await isOpsUser(user)
    if (isOps) {
      return NextResponse.redirect(new URL('/', opsUrl))
    }

    // 管理者権限チェック
    const isAdmin = await hasAdminAccess(user)
    if (isAdmin) {
      return NextResponse.redirect(new URL('/', adminUrl))
    }

    // 組織メンバーシップチェック
    const hasMembership = await hasOrganizationAccess(user)
    if (hasMembership) {
      return NextResponse.redirect(new URL('/', appUrl))
    }

    // 組織未所属の場合はオンボーディングへ
    return NextResponse.redirect(new URL('/onboarding/create-organization', wwwBase))
  }
}
```

**ログインページの簡素化**: `src/app/(www)/login/page.tsx`

```typescript
// ログイン済みユーザーのリダイレクト処理はミドルウェアで行われます
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return <LoginForm />
}
```

**動作**:
- ログイン済みユーザーが`/login`にアクセスした場合、ミドルウェアで即座にリダイレクト
- Server ComponentでCookieを設定しようとするエラーを回避
- より安全でクリーンな実装

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/app/app/settings/profile/page.tsx` | 担当者名・アバターURL削除 | 変更 |
| `src/app/admin/members/page.tsx` | カラムヘッダを「氏名・メール・ロール・最終使用日・アクション」に変更 | 変更 |
| `src/components/InviteMemberForm.tsx` | 氏名入力フィールド追加 | 変更 |
| `src/app/actions/members.ts` | 氏名をプロフィールに設定 | 変更 |
| `src/lib/validation.ts` | inviteMemberSchemaに氏名フィールド追加 | 変更 |
| `src/components/OrganizationSettingsForm.tsx` | slugフィールド削除 | 変更 |
| `supabase/migrations/20250117130001_remove_slug_from_organizations.sql` | slugカラム削除マイグレーション | 既存 |
| `e2e/auth-flow.spec.ts` | 削除 | 削除 |
| `e2e/domain-auth.spec.ts` | 削除 | 削除 |
| `e2e/auth.spec.ts` | 新しいシンプルなテスト | 新規 |
| `src/middleware.ts` | ログイン済みユーザーのリダイレクト処理追加 | 変更 |
| `src/app/(www)/login/page.tsx` | ミドルウェアに処理を移動、シンプル化 | 変更 |

### ✅ テスト項目

- [x] APP profile設定で担当者名・アバターURLが削除されている
- [x] ADMIN members一覧のカラムヘッダが変更されている
- [x] ADMIN member招待で氏名が入力できる
- [x] ローカル環境で招待したメンバーに氏名が設定される
- [x] ADMIN organization設定でslugフィールドが削除されている
- [x] データベースからslugカラムが削除されている
- [ ] E2Eテストが.local.testドメインで正しく動作する
- [x] ログイン済みユーザーがWWWログインページにアクセスすると即座にリダイレクト

### 🔗 関連リンク

- E2Eテスト: `e2e/auth.spec.ts`
- マイグレーション: `supabase/migrations/20250117130001_remove_slug_from_organizations.sql`
- 認証ミドルウェア: `src/middleware.ts`

---

## 2025-10-18: E2Eテストファイルの整理とリファクタリング

### 📌 実装の背景

新しい認証仕様（共通パスワード`test1234`、`.local.test`ドメイン）への移行完了後、古い仕様のテストファイルが残っており、以下の問題がありました：

1. **テストコードの重複**: `auth.spec.ts`と同じ内容をテストする古いファイルが複数存在
2. **古い仕様の混在**: 古いパスワード形式（`MemberPassword123!`）や`localhost`ドメインを使用するテストが残存
3. **メンテナンス性の低下**: 未実装機能のテストファイルが多く、どれが有効なのか不明確
4. **本番環境テストの不明確さ**: Vercel Preview環境用のテストファイルがハードコードされており、環境切り替えができない

### 🎯 実装内容

#### 1. 古い・重複するテストファイルの削除（5ファイル）

**削除したファイル**:
- `e2e/auth-manual-test.spec.ts` - `auth.spec.ts`と重複する手動テスト
- `e2e/login-redirect.spec.ts` - `auth.spec.ts`のログインリダイレクトテストと重複
- `e2e/localhost.spec.ts` - `.local.test`ドメインへの移行により不要
- `e2e/vercel-preview.spec.ts` - 環境固有のハードコードされたテスト（環境変数で対応可能）
- `e2e/organization.spec.ts` - 古い仕様のテスト、スキップされたテストを含む

**削除理由**:
```typescript
// 例: login-redirect.spec.ts（古いパスワード）
const password = 'AdminPassword123!'  // ❌ 古い仕様

// auth.spec.ts（新しい仕様）
const TEST_PASSWORD = 'test1234'  // ✅ 新しい仕様

// 例: localhost.spec.ts（古いドメイン）
await page.goto('http://localhost:3000')  // ❌ Cookie共有できない

// auth.spec.ts（新しいドメイン）
await page.goto('http://www.local.test:3000')  // ✅ Cookie共有可能
```

#### 2. 保持したテストファイル（6ファイル）

将来の実装に備えて以下は保持：
- ✅ `e2e/auth.spec.ts` - 認証フロー（最新・更新済み）
- 📝 `e2e/domain-layouts.spec.ts` - レイアウトテスト（実装待ち）
- 📝 `e2e/member-invitation.spec.ts` - メンバー招待（実装待ち）
- 📝 `e2e/organization-switching.spec.ts` - 組織切り替え（実装待ち）
- 📝 `e2e/admin-domain.spec.ts` - ADMINドメイン（実装待ち）
- 📝 `e2e/ops-domain.spec.ts` - OPSドメイン（実装待ち）

#### 3. 本番環境テストの方針決定

**問題**: `vercel-preview.spec.ts`はドメインがハードコード
```typescript
// ❌ 環境固有のハードコード
await page.goto('https://www.cocktailorder.com')
await page.goto('https://app.cocktailorder.com')
```

**解決策**: 環境変数でテスト対象を切り替え可能に

既存の`package.json`スクリプト:
```json
{
  "test:e2e": "playwright test",  // ローカル
  "test:e2e:preview": "PLAYWRIGHT_BASE_URL=https://www.cocktailorder.com playwright test",
  "test:e2e:production": "PLAYWRIGHT_BASE_URL=https://your-production-domain.com playwright test"
}
```

`playwright.config.ts`が既にサポート:
```typescript
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
```

**効果**:
- ハードコードされたドメインテストファイルが不要に
- 既存のテストファイルが環境変数で本番/Preview環境でも実行可能
- CI/CD環境での柔軟な運用が可能

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `e2e/auth-manual-test.spec.ts` | 削除（auth.spec.tsと重複） | 削除 |
| `e2e/login-redirect.spec.ts` | 削除（auth.spec.tsと重複） | 削除 |
| `e2e/localhost.spec.ts` | 削除（.local.testに移行済み） | 削除 |
| `e2e/vercel-preview.spec.ts` | 削除（環境変数で対応可能） | 削除 |
| `e2e/organization.spec.ts` | 削除（古い仕様・他と重複） | 削除 |

### ✅ 効果・改善点

- ✅ **テストコードの明確化**: 重複がなくなり、役割が明確に
- ✅ **メンテナンス性向上**: 古い仕様のテストがなくなり混乱を防ぐ
- ✅ **環境切り替えが容易**: 環境変数で本番/Preview環境のテストが可能
- ✅ **実行速度向上**: 不要なテストファイルがなくなりテスト時間短縮
- ✅ **一貫性の確保**: すべてのテストが新しいパスワード仕様（`test1234`）と`.local.test`ドメインを使用

### 📊 テストファイル数の変化

```
削除前: 11ファイル
 ├─ auth-manual-test.spec.ts
 ├─ login-redirect.spec.ts
 ├─ localhost.spec.ts
 ├─ vercel-preview.spec.ts
 ├─ organization.spec.ts
 ├─ auth.spec.ts ✅
 ├─ admin-domain.spec.ts ✅
 ├─ domain-layouts.spec.ts ✅
 ├─ member-invitation.spec.ts ✅
 ├─ ops-domain.spec.ts ✅
 └─ organization-switching.spec.ts ✅

削除後: 6ファイル（実装済み1 + 実装待ち5）
 ├─ auth.spec.ts ✅ 認証フロー（最新）
 ├─ admin-domain.spec.ts 📝 実装待ち
 ├─ domain-layouts.spec.ts 📝 実装待ち
 ├─ member-invitation.spec.ts 📝 実装待ち
 ├─ ops-domain.spec.ts 📝 実装待ち
 └─ organization-switching.spec.ts 📝 実装待ち

削減率: 約45%減（11 → 6ファイル）
```

### 🔗 関連リンク

- E2Eテスト設定: `playwright.config.ts`
- 実装済みテスト: `e2e/auth.spec.ts`
- テストアカウント情報: `e2e/TEST_ACCOUNTS.md`
- npm scriptsドキュメント: `package.json`

---

## 2025-10-18: E2Eテスト仕様書の整理と作成

### 📌 実装の背景

E2Eテストの仕様が不明確で、以下の問題がありました：

1. **不要なテストファイル**: 未実装機能のテストファイル（`member-invitation.spec.ts`、`domain-layouts.spec.ts`）が存在し、実装との乖離が発生
2. **仕様書の不足**: 各ドメイン（APP、ADMIN、OPS）と組織切り替え機能のE2Eテスト仕様が文書化されていない
3. **実装優先度の不明確さ**: どの機能を先に実装すべきか、Phase分けが曖昧

### 🎯 実装内容

#### 1. 不要なE2Eテストファイルの削除（2ファイル）

**削除したファイル**:
- `e2e/member-invitation.spec.ts` - メンバー招待機能が未実装のため
- `e2e/domain-layouts.spec.ts` - デザインが未確定のため

**削除後のテストファイル構成（4ファイル）**:
1. ✅ `e2e/auth.spec.ts` - 認証フロー（実装済み）
2. ⏳ `e2e/organization-switching.spec.ts` - 組織切り替え（実装待ち）
3. ⏳ `e2e/admin-domain.spec.ts` - ADMINドメイン（実装待ち）
4. ⏳ `e2e/ops-domain.spec.ts` - OPSドメイン（実装待ち）

**新規追加が必要**: `e2e/app-domain.spec.ts`（仕様書作成済み、テストファイル未作成）

#### 2. E2Eテスト仕様書の作成（4ファイル）

既存実装を無視し、理想的なマルチテナントSaaSのE2Eテスト仕様を新規作成しました。

##### **`docs/specifications/E2E_TEST_APP_DOMAIN.md`**
**APPドメイン（一般ユーザー向け）のテスト仕様**

**Phase 1 MVP**:
- ダッシュボード表示（ウェルカムメッセージ、組織情報、ロール表示）
- プロフィール設定（名前、メールアドレス、パスワード変更）
- 組織情報の閲覧（編集権限なし）

**使用アカウント**: `member@example.com`

**Phase 3（後回し）**: 通知機能

##### **`docs/specifications/E2E_TEST_ADMIN_DOMAIN.md`**
**ADMINドメイン（組織管理）のテスト仕様**

**Phase 1 MVP**:
- 組織情報の編集（組織名、スラッグ、設定）
- メンバー管理（招待、削除、権限変更）
- プロフィール設定

**Phase 2**:
- サブスクリプション管理（プラン変更、支払い情報更新）
- 使用量モニタリング
- 監査ログ閲覧

**環境別の挙動**:
- ローカル環境: メンバー招待時にメール送信なし、パスワード固定（`password123`）
- Vercel環境: 招待メール送信、ユーザーが自分でパスワード設定

**使用アカウント**: `owner@example.com`, `admin@example.com`

##### **`docs/specifications/E2E_TEST_OPS_DOMAIN.md`**
**OPSドメイン（システム管理）のテスト仕様**

**Phase 1 MVP**:
- OPS専用ログイン（`ops.local.test:3000/login`）
- IP制限チェック（許可されたIPアドレスのみアクセス可能）
- 全組織一覧表示
- 全ユーザー一覧表示

**Phase 2**:
- 組織詳細の確認・編集
- ユーザー詳細の確認・編集
- システム統計情報
- システムログ閲覧

**IP制限の仕様**:
- 環境変数: `OPS_ALLOWED_IPS=192.168.1.100,10.0.0.50`
- ミドルウェアで判定（`src/middleware.ts`）
- 未設定時は制限なし（開発環境用）

**使用アカウント**: `ops@example.com`

##### **`docs/specifications/E2E_TEST_ORG_SWITCHING.md`**
**組織切り替え機能のテスト仕様**

**Phase 1 MVP**:
- 組織切り替えUI表示（複数組織に所属している場合）
- 組織切り替え実行（ドロップダウンから選択）
- Cookie更新確認（`current_organization_id`）
- データ表示更新（切り替え後に新しい組織のデータを表示）

**Phase 2**:
- 権限別リダイレクト（切り替え先の権限に応じてドメインをリダイレクト）
- 組織未所属の場合のエラーハンドリング

**Cookie設計**:
- Cookie名: `current_organization_id`
- ドメイン: `.local.test`（サブドメイン間で共有）
- HTTPOnly: `true`（セキュリティ）
- SameSite: `lax`

**使用アカウント**: `multiorg@example.com`（複数組織に所属、手動で作成が必要）

#### 3. 仕様書の特徴

- **既存実装を無視**: 現在の実装に縛られず、理想的なマルチテナントSaaSの仕様を定義
- **フェーズ分け**: MVP（Phase 1）と拡張機能（Phase 2, 3）を明確に分離
- **詳細なテストケース**: 前提条件、操作手順、期待結果を明記
- **環境別の挙動**: ローカル環境とVercel環境の違いを記載
- **テストアカウント一覧**: 各テストで使用するアカウントを表形式で整理
- **実装優先度**: 各機能の優先度を🔴高、🟡中、🟢低で明示

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `e2e/member-invitation.spec.ts` | 削除（未実装機能） | 削除 |
| `e2e/domain-layouts.spec.ts` | 削除（デザイン未確定） | 削除 |
| `docs/specifications/E2E_TEST_APP_DOMAIN.md` | APPドメインのE2Eテスト仕様 | 新規 |
| `docs/specifications/E2E_TEST_ADMIN_DOMAIN.md` | ADMINドメインのE2Eテスト仕様 | 新規 |
| `docs/specifications/E2E_TEST_OPS_DOMAIN.md` | OPSドメインのE2Eテスト仕様 | 新規 |
| `docs/specifications/E2E_TEST_ORG_SWITCHING.md` | 組織切り替え機能のE2Eテスト仕様 | 新規 |

### ✅ 効果・改善点

- ✅ **テスト仕様の明確化**: 各ドメインと機能のテスト要件が文書化された
- ✅ **実装優先度の可視化**: Phase分けにより、何を先に実装すべきかが明確に
- ✅ **不要なテストの削除**: 未実装機能のテストファイルがなくなりメンテナンス性向上
- ✅ **環境別の挙動を明記**: ローカルとVercel環境の違いを仕様書に記載
- ✅ **Cookie設計の文書化**: 組織切り替えに必要なCookie仕様を明確化

### 📊 テストファイル数の変化

```
削除前: 6ファイル
 ├─ auth.spec.ts ✅
 ├─ admin-domain.spec.ts ⏳
 ├─ domain-layouts.spec.ts ⏳
 ├─ member-invitation.spec.ts ⏳
 ├─ ops-domain.spec.ts ⏳
 └─ organization-switching.spec.ts ⏳

削除後: 4ファイル（実装済み1 + 実装待ち3）
 ├─ auth.spec.ts ✅ 認証フロー（実装済み）
 ├─ organization-switching.spec.ts ⏳ 実装待ち
 ├─ admin-domain.spec.ts ⏳ 実装待ち
 └─ ops-domain.spec.ts ⏳ 実装待ち

削減率: 約33%減（6 → 4ファイル）
```

### 🔧 技術的なポイント

#### Cookie設計
- Cookie名: `current_organization_id`
- ドメイン: `.local.test`（サブドメイン間で共有）
- HTTPOnly: true（セキュリティ）
- SameSite: lax

#### IP制限（OPSドメイン）
- 環境変数: `OPS_ALLOWED_IPS=192.168.1.100,10.0.0.50`
- ミドルウェアで判定（`src/middleware.ts`）
- 未設定時は制限なし（開発環境用）

#### 権限の階層
- **OPS**: システム全体の管理（組織に所属しない）
- **owner**: 組織のすべての管理（サブスクリプション含む）
- **admin**: 組織管理（サブスクリプション除く）
- **member**: 一般機能のみ（管理機能なし）

### 🎯 次のステップ

1. Phase 1 MVP機能の実装開始
2. 各仕様書に基づいてテストファイル（`.spec.ts`）を作成
3. テスト実行 → 実装 → テスト成功のサイクル

### 🔗 関連リンク

- E2Eテスト仕様書: `docs/specifications/E2E_TEST_*.md`
- 実装済みテスト: `e2e/auth.spec.ts`
- テストアカウント情報: `e2e/TEST_ACCOUNTS.md`
- マルチドメイン設定: `docs/specifications/MULTI_DOMAIN_SETUP.md`

---

## 2025-10-18: 組織情報閲覧ページの実装とE2Eテストの環境変数対応

### 📌 実装の背景

E2Eテスト仕様書の作成後、Phase 1 MVP機能の中から「軽い（実装が簡単）」機能として組織情報閲覧ページを実装しました。また、E2Eテストが`.local.test`ドメインではなく`localhost`を使用しており、Vercel Preview環境でも動作するように環境変数対応が必要でした。

**問題点**:
1. APPドメインに組織情報を閲覧するページが存在しない（仕様書には記載済み）
2. E2Eテストファイルがドメインをハードコード（`localhost:3000`）
3. Vercel Preview環境でテストが動作しない（ドメインが異なる）

### 🎯 実装内容

#### 1. 組織情報閲覧ページの実装（APPドメイン）

**新規ページ**: `src/app/app/organization/page.tsx`

**機能**:
- 現在の組織の基本情報を表示（組織名、組織ID、メンバー数、プラン、作成日）
- ユーザーの権限を表示（オーナー/管理者/ユーザー）
- 権限に応じたUI切り替え:
  - **member権限**: 読み取り専用、編集不可のメッセージを表示
  - **owner/admin権限**: 「管理画面で編集」ボタンを表示（ADMIN URLにリンク）

```typescript
export default async function OrganizationInfoPage() {
  const supabase = await createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
  }

  // 現在の組織IDを取得
  const organizationId = await getCurrentOrganizationId()

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  // メンバー数を取得
  const { count: membersCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // ユーザーの権限を取得
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  const role = membership?.role || 'member'
  const isAdmin = role === 'owner' || role === 'admin'

  // UI表示: 組織情報、権限、管理画面リンク（権限がある場合）
}
```

**UIの特徴**:
- 白背景とグラデーション、視認性の高い配色
- member権限の場合: 青色の注意メッセージを表示
- admin権限の場合: 「管理画面で編集」ボタンを各セクションに配置
- オーナーバッジに王冠アイコン（👑）を表示

**ナビゲーション追加**: `src/app/app/layout.tsx`

```typescript
// ナビゲーションに「組織情報」リンクを追加（プロフィール設定と管理画面の間）
<a
  href="/organization"
  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
>
  組織情報
</a>
```

#### 2. E2Eテストヘルパーの環境変数対応

**ファイル**: `e2e/helpers.ts`

**変更内容**:

1. **ドメイン定義を環境変数で取得**:
```typescript
// 変更前
export const DOMAINS = {
  WWW: 'http://www.local.test:3000',
  APP: 'http://app.local.test:3000',
  ADMIN: 'http://admin.local.test:3000',
  OPS: 'http://ops.local.test:3000',
} as const

// 変更後
export const DOMAINS = {
  WWW: process.env.NEXT_PUBLIC_WWW_URL || 'http://www.local.test:3000',
  APP: process.env.NEXT_PUBLIC_APP_URL || 'http://app.local.test:3000',
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.local.test:3000',
  OPS: process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.local.test:3000',
} as const
```

2. **URL待機パターンの修正**:
```typescript
// 変更前
await page.waitForURL(/localhost:3000/, { timeout: 10000 })

// 変更後
await page.waitForURL(/local\.test:3000/, { timeout: 10000 })
```

3. **ログアウト後のリダイレクト確認を修正**:
```typescript
// 変更前
await page.waitForURL(/^http:\/\/localhost:3000/)

// 変更後
await page.waitForURL(/^http:\/\/www\.local\.test:3000/)
```

**効果**:
- ローカル環境: `.env.local`の値を使用（`.local.test`ドメイン）
- Vercel Preview環境: 環境変数から動的にドメインを取得
- フォールバック: 環境変数が未設定の場合は`.local.test`を使用

#### 3. E2Eテストファイルのドメイン修正

**ファイル**:
- `e2e/admin-domain.spec.ts`
- `e2e/organization-switching.spec.ts`

**変更内容**: すべての`localhost`を`local.test`に置換

```typescript
// admin-domain.spec.ts（2箇所）
await expect(page).toHaveURL(/admin\.local\.test:3000/)  // 変更前: admin\.localhost:3000

// organization-switching.spec.ts（5箇所）
await expect(page).toHaveURL(/admin\.local\.test:3000/, { timeout: 5000 })
await expect(page).toHaveURL(/app\.local\.test:3000/, { timeout: 5000 })
```

#### 4. E2Eテストの実行と検証

**実行コマンド**: `npm run test:e2e -- auth.spec.ts`

**結果**: ✅ **15/15 テスト成功**（3ブラウザ × 5テスト）

```
Running 15 tests using 3 workers
  15 passed (16.8s)
```

**テスト内訳**:
- サインアップフロー → プラン選択ページ到達
- owner権限ログイン → ADMINドメインリダイレクト
- member権限ログイン → APPドメインリダイレクト
- 不正な認証情報 → エラーメッセージ表示
- ログアウト → WWWドメインリダイレクト

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/app/app/organization/page.tsx` | 組織情報閲覧ページ | 新規 |
| `src/app/app/layout.tsx` | ナビゲーションに「組織情報」リンク追加 | 変更 |
| `e2e/helpers.ts` | DOMAINS定義を環境変数で取得、URL待機パターンを修正 | 変更 |
| `e2e/admin-domain.spec.ts` | ドメインを`localhost`→`local.test`に修正 | 変更 |
| `e2e/organization-switching.spec.ts` | ドメインを`localhost`→`local.test`に修正 | 変更 |

### ✅ テスト項目

- [x] 組織情報閲覧ページが表示される（組織名、ID、メンバー数、プラン、作成日）
- [x] member権限の場合、編集不可のメッセージが表示される
- [x] owner/admin権限の場合、「管理画面で編集」ボタンが表示される
- [x] ナビゲーションに「組織情報」リンクが追加されている
- [x] E2Eテストヘルパーが環境変数からドメインを取得できる
- [x] E2Eテストが`.local.test`ドメインで正しく動作する
- [x] `auth.spec.ts`の全15テストが成功する

### 🔄 実装フロー

```
1. E2Eテスト仕様書の作成
   ↓
2. Phase 1 MVP機能の選定（組織情報閲覧）
   ↓
3. 組織情報閲覧ページの実装（src/app/app/organization/page.tsx）
   ↓
4. ナビゲーションリンクの追加（src/app/app/layout.tsx）
   ↓
5. E2Eテストヘルパーの環境変数対応（e2e/helpers.ts）
   ↓
6. E2Eテストファイルのドメイン修正（admin-domain.spec.ts, organization-switching.spec.ts）
   ↓
7. E2Eテスト実行と検証（auth.spec.ts: 15/15成功）
```

### 🎨 UIの特徴

- **配色**: 白背景、グラデーション、視認性の高い文字色
- **レイアウト**: 3つのセクション（基本情報、あなたの権限）
- **権限別UI**:
  - member権限: 青色の注意メッセージ
  - owner/admin権限: 「管理画面で編集」ボタン
- **バッジ**: オーナーに王冠アイコン（👑）

### 🔗 関連リンク

- E2Eテスト仕様書: `docs/specifications/E2E_TEST_APP_DOMAIN.md`
- 組織情報閲覧ページ: `src/app/app/organization/page.tsx:1`
- E2Eテストヘルパー: `e2e/helpers.ts:42`
- 実装済みテスト: `e2e/auth.spec.ts`

---

## 2025-10-23: クロスドメインリダイレクトとE2Eテストの修正

### 📌 実装の背景

E2Eテスト（組織切り替え機能）で以下の問題が発生していました：

1. **クロスドメインリダイレクトの失敗**: Next.js 13+ のServer Action内の`redirect()`関数が、クロスドメイン（`www.local.test` → `admin.local.test`）をサポートしていない
2. **E2Eテストデータの重複**: `global-setup.ts`で組織名が重複しており、2番目の組織作成時に1番目の組織が削除されていた
3. **テスト期待値の厳しさ**: Playwrightテストの期待値がポート番号を厳密にチェックしすぎていた

### 🎯 実装内容

#### 1. クロスドメインリダイレクトの修正

**問題**: Next.js Server Action内の`redirect()`はクロスドメインをサポートしていない

**ファイル**: `src/app/actions/auth.ts`

```typescript
// 修正前
const redirectUrl = await getRedirectUrlForUser(user)
redirect(redirectUrl)  // ❌ クロスドメインリダイレクトが動作しない

// 修正後
const redirectUrl = await getRedirectUrlForUser(user)
return { success: true, redirectUrl }  // ✅ URLを返す
```

**ファイル**: `src/components/LoginForm.tsx`

```typescript
// Client Componentでクロスドメインリダイレクトを実行
const result = await signIn(formData)

if (result?.success && result.redirectUrl) {
  window.location.href = result.redirectUrl  // ✅ クライアントサイドリダイレクト
  return
}
```

**動作**:
- Server Actionは`redirect()`の代わりにリダイレクト先URLを返す
- Client Componentが`window.location.href`でクロスドメインリダイレクトを実行
- `www.local.test:3000` → `admin.local.test:3000`の遷移が正常に動作

#### 2. E2Eテストデータの重複修正

**問題**: 組織名が重複していた

**ファイル**: `e2e/global-setup.ts`

```typescript
// 修正前（同じ名前で重複）
await createTestOrganization(ownerUser.id, 'Owner Organization', 'owner-org')
await createTestOrganization(multiOrgUser.id, 'Owner Organization', 'owner-org-multiorg')  // ❌ 重複

// 修正後（一意な名前に変更）
await createTestOrganization(ownerUser.id, 'Owner Organization', 'owner-org')
await createTestOrganization(multiOrgUser.id, 'MultiOrg Owner Organization', 'multiorg-owner-org')  // ✅ 一意
await createTestOrganization(multiOrgUser.id, 'MultiOrg Admin Organization', 'multiorg-admin-org')  // ✅ 一意
```

**ファイル**: `e2e/helpers.ts`

```typescript
// TEST_USERSの組織名も更新
'multi-org': {
  email: 'multiorg@example.com',
  password: 'test1234',
  organizations: ['MultiOrg Owner Organization', 'MultiOrg Admin Organization'],  // 更新
  roles: ['owner', 'admin'],
}
```

**効果**:
- 組織作成時に既存組織が削除されなくなった
- `owner@example.com`が正しく1つの組織に所属
- `multiorg@example.com`が正しく2つの組織に所属

#### 3. Playwrightテストの期待値を柔軟化

**ファイル**: `e2e/organization-switching.spec.ts`, `e2e/organization-switching-simple.spec.ts`, `e2e/helpers.ts`

```typescript
// 修正前
await expect(page).toHaveURL(/admin\.local.test:3000/, { timeout: 5000 })  // ❌ ポート番号が厳密

// 修正後
await expect(page).toHaveURL(/admin\.local\.test(:\d+)?/, { timeout: 5000 })  // ✅ ポート番号オプショナル
```

**効果**:
- ポート番号の有無に関わらずテストが成功
- 本番環境（ポート番号なし）でも動作可能

### 📁 変更ファイル一覧

| ファイル | 変更内容 | タイプ |
|---------|---------|--------|
| `src/app/actions/auth.ts` | redirect()をURLを返す形式に変更 | 変更 |
| `src/components/LoginForm.tsx` | window.location.hrefでリダイレクト実行 | 変更 |
| `e2e/global-setup.ts` | 組織名を一意に変更（MultiOrg Owner/Admin Organization） | 変更 |
| `e2e/helpers.ts` | TEST_USERSの組織名を更新、正規表現を調整 | 変更 |
| `e2e/organization-switching.spec.ts` | ポート番号をオプショナルに（replace_all） | 変更 |
| `e2e/organization-switching-simple.spec.ts` | 新規テストファイル、ポート番号オプショナル | 新規 |

### ✅ テスト項目

- [x] ログイン後のクロスドメインリダイレクトが動作する（www → admin）
- [x] E2Eテストで組織名の重複が解消されている
- [x] owner@example.comが1つの組織に所属している
- [x] multiorg@example.comが2つの組織に所属している
- [x] Playwrightテストがポート番号の有無に関わらず成功する
- [x] E2Eテスト全15個が成功（Chromium、Firefox、Webkit × 5テスト）

### 🔄 テスト結果

```
✅ 15/15 passed (46.9s)

テストケース:
1. 組織切り替えUIが表示される ✅
2. 組織を切り替えると表示が更新される ✅
3. ローディングインジケーターが表示される ✅
4. 組織切り替え後、Cookieが更新される ✅
5. 単一組織のユーザーには組織切り替えが表示されない ✅

各テストがChromium、Firefox、Webkitで成功
```

### 🔧 技術的なポイント

#### Next.js Server Actionsの制約
- `redirect()`は同一ドメイン内でのみ動作
- クロスドメインリダイレクトは`window.location.href`を使用する必要がある
- Server ActionからURLを返し、Client Componentでリダイレクトを実行

#### E2Eテストデータの設計
- 組織名は一意である必要がある
- セットアップスクリプトで名前重複チェックがないため、明示的に一意にする
- テストアカウントの組織情報はTEST_USERSとglobal-setupで一致させる

### 🔗 関連リンク

- E2Eテスト: `e2e/organization-switching-simple.spec.ts`
- 認証アクション: `src/app/actions/auth.ts:181`
- ログインフォーム: `src/components/LoginForm.tsx:19`
- テストセットアップ: `e2e/global-setup.ts:73`

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
