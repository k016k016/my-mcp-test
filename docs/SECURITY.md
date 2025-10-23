# セキュリティガイド

このドキュメントは、アプリケーションのセキュリティ設定と本番環境でのベストプラクティスを説明します。

## Cookie設定

### 現在の設定

`src/lib/organization/current.ts`で組織IDを管理するCookieを使用しています。

```typescript
{
  httpOnly: true,              // ✓ XSS攻撃を防ぐ（JavaScriptからアクセス不可）
  secure: true,                // ✓ HTTPS接続でのみ送信（本番環境）
  sameSite: 'strict',          // ✓ CSRF攻撃を防ぐ（最も厳格な設定）
  maxAge: 60 * 60 * 24 * 30,   // 30日間有効
  path: '/',                   // すべてのパスで有効
  domain: '.yourdomain.com',   // サブドメイン間で共有
}
```

### セキュリティレベル

| 設定 | 値 | セキュリティ効果 |
|------|-----|------------------|
| `httpOnly` | `true` | XSS攻撃を防ぐ。JavaScriptからCookieにアクセスできなくなる |
| `secure` | `true` | HTTPS接続でのみCookieを送信。中間者攻撃(MITM)を防ぐ |
| `sameSite` | `strict` | CSRF攻撃を完全に防ぐ。クロスサイトリクエストでCookieが送信されない |
| `domain` | `.yourdomain.com` | サブドメイン間でCookie共有。範囲を最小限に |

### sameSite属性の比較

| 値 | セキュリティ | 動作 | 推奨用途 |
|-----|-------------|------|----------|
| `strict` | **最高** | クロスサイトリクエストで一切送信されない | 本番環境で推奨 |
| `lax` | 中 | トップレベルナビゲーション（リンククリック）では送信される | 外部サイトからのリンク対応が必要な場合 |
| `none` | 低 | すべてのクロスサイトリクエストで送信される | 非推奨（CSRF脆弱性） |

**⚠️ 重要**: このアプリケーションでは`sameSite: 'strict'`を使用しています。これはセキュリティ上最も安全ですが、以下の点に注意してください：

- 外部サイトからのリンク経由でアクセスした場合、初回アクセス時はCookieが送信されません
- メール内のリンクからアクセスした場合も同様です
- ただし、ユーザーがサイト内でページ遷移すると、Cookieは正常に機能します

### Cookie Domain設定

`domain`属性はサブドメイン間でCookieを共有するために使用します。

**開発環境**:
```bash
# .env.local (開発環境では未設定でOK)
# 未設定の場合、自動的に .local.test が使用されます
```

**本番環境**:
```bash
# .env.local または Vercel環境変数
NEXT_PUBLIC_COOKIE_DOMAIN=.example.com
```

**セキュリティのポイント**:
- ドメインは必要最小限の範囲に設定してください
- 例: `.example.com` → `app.example.com`, `admin.example.com`, `www.example.com`で共有
- `.com` のような広範囲の設定は**絶対に避けてください**

## 認証とアクセス制御

### サーバーサイドでの権限チェック

**✓ 正しい実装**: すべてのADMIN画面でServer Componentで権限チェック

```typescript
// src/app/admin/layout.tsx
export default async function AdminLayout() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 管理者権限チェック（サーバーサイド）
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(id, name)')
    .eq('user_id', user.id)

  const currentMembership = memberships?.find(m => m.organization.id === currentOrgId)
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  if (!isAdmin) {
    redirect('/app?message=管理者権限がありません')
  }

  return <>{children}</>
}
```

**✗ 悪い実装**: クライアントサイドでの権限チェック（回避可能）

```typescript
// ❌ これはセキュリティ上危険
'use client'
export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // クライアント側でチェック → DevToolsで回避可能
    checkAdminPermission().then(setIsAdmin)
  }, [])

  if (!isAdmin) return <div>権限がありません</div>
}
```

### Row Level Security (RLS)

Supabaseデータベースでは、すべてのテーブルにRLSポリシーが適用されています。

**例**: organizationsテーブルのRLS

```sql
-- ユーザーは自分が所属する組織のみ閲覧可能
CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- オーナーと管理者のみ組織を更新可能
CREATE POLICY "Owners and admins can update organizations"
ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND deleted_at IS NULL
  )
);
```

詳細は `docs/DATABASE_SCHEMA.md` を参照してください。

## 環境変数の管理

### 公開して良いキー

`NEXT_PUBLIC_*` プレフィックスがついた環境変数はクライアント側（ブラウザ）に公開されます。

```bash
# ✓ これらは公開されても安全
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_COOKIE_DOMAIN=.example.com
```

### 絶対に公開してはいけないキー

```bash
# ❌ これらは絶対に公開しない
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
R2_SECRET_ACCESS_KEY=...
UPSTASH_REDIS_REST_TOKEN=...
CHARGEBEE_API_KEY=...
RESEND_API_KEY=...
```

**ルール**:
- サーバーサイドでのみ使用するキーには`NEXT_PUBLIC_`をつけない
- `.env.local` はGitにコミットしない（既に`.gitignore`に含まれています）
- Vercel等のデプロイ先では環境変数設定UIを使用する

## 本番環境でのチェックリスト

デプロイ前に以下を確認してください：

### 必須設定

- [ ] `NEXT_PUBLIC_COOKIE_DOMAIN` を本番ドメインに設定（例: `.example.com`）
- [ ] すべてのドメイン（WWW/APP/ADMIN/OPS）をHTTPSで運用
- [ ] `NODE_ENV=production` が設定されている
- [ ] Supabase RLSポリシーがすべてのテーブルで有効
- [ ] OPS画面のIP制限を設定（`OPS_ALLOWED_IPS`）

### セキュリティ設定

- [ ] Cookie設定: `sameSite: 'strict'`, `secure: true`, `httpOnly: true`
- [ ] サービスロールキーは使用せず、RLSで制御
- [ ] APIキーは定期的にローテーション
- [ ] Sentryでエラー監視を有効化
- [ ] 本番とステージング環境で異なるAPIキーを使用

### アクセス制御

- [ ] すべてのADMIN画面でサーバーサイド権限チェック実装済み
- [ ] OPS画面はIP制限またはVPN経由のみアクセス可能
- [ ] 認証が必要なページで未認証ユーザーをリダイレクト

### 監査とログ

- [ ] 監査ログが`audit_logs`テーブルに記録されている
- [ ] Logflareでログ監視を有効化
- [ ] 重要な操作（組織作成、メンバー招待など）がログに記録されている

## インシデント対応

セキュリティインシデントが発生した場合：

1. **即座に対応**:
   - 影響を受けたAPIキーを即座にローテーション
   - 不正アクセスの可能性があるユーザーセッションを無効化
   - Supabaseダッシュボードで異常なクエリをチェック

2. **調査**:
   - `audit_logs`テーブルで不正な操作を調査
   - Logflareでアクセスログを確認
   - Sentryでエラーとスタックトレースを確認

3. **復旧**:
   - データベースのバックアップから復元（必要に応じて）
   - RLSポリシーを見直し、脆弱性を修正
   - セキュリティパッチを適用

4. **事後対応**:
   - インシデントレポートを作成
   - 再発防止策を実施
   - ユーザーへの通知（必要に応じて）

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
