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
