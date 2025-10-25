# CLAUDE_RUNTIME.md

Claudeはこのルールを厳守すること。これに反する提案や修正は無効。

## 1. ドメイン / 環境変数

* `localhost` は使わない。開発環境は `<APP_DOMAIN>`, `<ADMIN_DOMAIN>`, `<OPS_DOMAIN>` など複数サブドメイン前提。
* URLやドメインをコードやテストにハードコードしないこと。

  * 必ず `.env.local` の `NEXT_PUBLIC_*_URL` を参照すること。
* `.env.local` の値を正として扱い、それ以外を勝手に作らないこと。

## 2. Supabase / RLS / テナント境界

* 認証・DB・RLSは Supabase が唯一のソースオブトゥルース。これは固定。置き換え提案はしない。
* Row Level Security (RLS) は常に有効。RLSを外す・バイパスする提案は禁止。
* すべてのDB操作では `organization_id` を明示的に扱う。これはテナント境界キー。
* `if (TEST) { return admin }` のような一時的な権限昇格は禁止。

## 3. 権限モデル

* 組織には `owner` / `admin` / `member` ロールがある。`owner` は必須で、`owner` 不在の組織は作らない。
* `ops` は別軸ロール。`owner`/`admin`/`member` と混ぜない。
* テストやサンプルのためにロールを勝手に付け替えたり、全権ユーザを即席で作る提案は禁止。

## 4. Server Action

* Server Action内で `redirect()` を使ってはいけない。例外なし。同一ドメインでも禁止。
* Server Actionは画面遷移を行わない。遷移はクライアント側で行う。
* Server Actionは必ず次の型で返す。独自フォーマットを作らないこと。

```ts
export type ActionResult<T> =
  | { success: true; data?: T; nextUrl?: string }
  | { success: false; error: string; nextUrl?: string }
```

* `nextUrl` は相対パスでもフルURLでもよい。クライアント側でこの値を使って遷移すること。
* `error` は今は文字列で返してよいが、将来的に `errorCode` 化する可能性がある。UIをサーバーの文字列にベタ結合しないこと。

## 5. E2Eテスト / ログイン

* E2Eテストでは、ADRで定義された「E2E専用ログインバイパス」を使ってログイン済み状態から開始してよい。
* middlewareを緩める / RLSを無効化する / `if (TEST) { return admin }` のような独自バイパス提案は禁止。
* このE2E専用バイパスは本番・本番相当環境では無効であることが前提。これを壊す提案は禁止。

## 6. middleware.ts

* middleware.ts は基本的に編集禁止。
* セッション処理、ドメイン判定、リダイレクト条件を簡略化・削除・書き換える提案は無効。
* どうしても変更が必要な場合のみ、最小限の差分だけ提案すること。
* 「全面書き直し」「まとめて楽にする」は禁止。

## 7. ADR

* 仕様変更（権限モデル / リダイレクト条件 / 環境変数など）を直接コードに埋める提案は禁止。
* 変更したい場合は「ADRを追加する」という提案から入ること。
