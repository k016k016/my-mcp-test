# B2B企業向けユーザーフロー設計

最終更新: 2025-10-15

## 📋 概要

### ビジネスモデル
- **ターゲット**: 企業のみ（B2B SaaS）
- **トライアル**: なし（契約 = 即課金）
- **最低ライセンス**: 3シート
- **契約者**: 企業管理者が契約してメンバーを追加

### 料金プラン
```
スタータープラン: 3シート  ¥4,500/月
ビジネスプラン:   5シート  ¥7,000/月
プロプラン:       10シート ¥12,000/月

追加ユーザー: ¥1,500/人/月
エンタープライズ: カスタム（要相談）
```

---

## 🔄 画面遷移フロー

### 【パターンA: 企業管理者の初回契約フロー】

#### 1. トップページ
```
URL: www.domain.com
```
- マーケティングコンテンツ
- [サインアップ] ボタン
- [ログイン] ボタン

#### 2. サインアップページ
```
URL: www.domain.com/signup

入力項目:
- メールアドレス（必須）
- パスワード（必須、8文字以上）
- 会社名（必須）
- 担当者名（必須）← 新規追加

バリデーション:
- メールアドレス形式チェック
- パスワード強度チェック
- 全項目必須

処理:
1. Supabase auth.signUp()
2. profiles テーブルに name, company_name を保存
3. メール確認送信
```

#### 3. メール確認待ち画面
```
URL: www.domain.com/auth/verify-email

表示内容:
- 「メールを確認してください」
- 送信先メールアドレス表示
- 「メールが届かない場合」リンク
```

#### 4. メール確認（受信箱）
```
件名: メールアドレスの確認

内容:
- 確認リンク
- リンククリック → www.domain.com/auth/callback?token=xxx
```

#### 5. 認証コールバック
```
URL: www.domain.com/auth/callback?token=xxx

処理:
1. トークン検証
2. セッション作成
3. リダイレクト → app.domain.com/onboarding/select-plan
```

#### 6. プラン選択ページ ← 新規作成
```
URL: app.domain.com/onboarding/select-plan

表示内容:
┌────────────────────────────────────────┐
│ プランを選択してください                │
│                                        │
│ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │スタート  │ │ビジネス  │ │プロ     ││
│ │          │ │          │ │         ││
│ │3シート   │ │5シート   │ │10シート ││
│ │¥4,500/月 │ │¥7,000/月 │ │¥12,000/月││
│ │          │ │          │ │         ││
│ │・機能A   │ │・機能A   │ │・機能A  ││
│ │・機能B   │ │・機能B   │ │・機能B  ││
│ │          │ │・機能C   │ │・機能C  ││
│ │          │ │          │ │・機能D  ││
│ │[選択]    │ │[選択]    │ │[選択]   ││
│ └──────────┘ └──────────┘ └─────────┘│
│                                        │
│ エンタープライズプランをご希望の場合は  │
│ [お問い合わせ →]                       │
└────────────────────────────────────────┘

処理:
- プラン選択 → app.domain.com/onboarding/payment?plan=starter
```

#### 7. 決済ページ ← 新規作成
```
URL: app.domain.com/onboarding/payment?plan=starter

表示内容:
┌────────────────────────────────────────┐
│ お支払い情報                            │
│                                        │
│ 選択プラン: スタータープラン            │
│ シート数:   3                          │
│ 月額:       ¥4,500                     │
│                                        │
│ ───────────────────────────────       │
│                                        │
│ [Chargebee/Stripe決済フォーム埋め込み] │
│                                        │
│ カード番号: [                ]         │
│ 有効期限:   [    ] / [    ]            │
│ CVC:       [    ]                      │
│                                        │
│ [支払いを確定してサービスを開始]        │
└────────────────────────────────────────┘

処理:
1. Chargebee/Stripe Checkout作成
2. 決済完了 → Webhookで organization_licenses 作成
3. リダイレクト → app.domain.com/onboarding/create-organization
```

#### 8. 組織作成ページ（既存を修正）
```
URL: app.domain.com/onboarding/create-organization

表示内容:
┌────────────────────────────────────────┐
│ 組織を作成                              │
│                                        │
│ 組織名:       [会社名（自動入力）]     │
│ 組織スラッグ: [company-name]           │
│                                        │
│ ───────────────────────────────       │
│ ライセンス情報:                        │
│ ・プラン: スタータープラン              │
│ ・シート数: 3                          │
│ ・使用中: 1/3（あなた）                │
│ ───────────────────────────────       │
│                                        │
│ [組織を作成]                           │
└────────────────────────────────────────┘

処理:
1. organizations テーブルに挿入
2. organization_members に自分を owner として追加
3. リダイレクト → app.domain.com/
```

#### 9. ダッシュボード（既存）
```
URL: app.domain.com/

表示内容:
┌────────────────────────────────────────┐
│ ようこそ、〇〇組織                      │
│                                        │
│ 次のステップ:                          │
│ ✓ 支払い完了                           │
│ ✓ 組織作成完了                         │
│ □ メンバーを招待（残り2シート）        │
│                                        │
│ [メンバーを招待する →]                 │
└────────────────────────────────────────┘
```

#### 10. メンバー管理ページ（既存）
```
URL: app.domain.com/settings/members

表示内容:
┌────────────────────────────────────────┐
│ メンバー管理                            │
│                                        │
│ ライセンス: 1/3 使用中（残り2シート）  │
│                                        │
│ ┌─ メンバーを招待 ──────────────┐   │
│ │ メールアドレス: [          ]   │   │
│ │ ロール: [Member ▼]             │   │
│ │         ・Owner（変更不可）    │   │
│ │         ・Admin                │   │
│ │         ・Member                │   │
│ │ [招待を送信]                   │   │
│ └─────────────────────────────┘   │
│                                        │
│ 現在のメンバー:                        │
│ ・田中太郎 (Owner) - あなた            │
└────────────────────────────────────────┘

処理:
1. ライセンス残数チェック
2. used_seats >= total_seats ならエラー
3. 招待メール送信
4. invitations テーブルに挿入
```

---

### 【パターンB: 招待されたメンバーのフロー】

#### 1. 招待メール受信
```
件名: 〇〇組織への招待

内容:
あなたは〇〇組織にメンバーとして招待されました。

役割: Member / Admin

[参加する →] (app.domain.com/invite/[token])
```

#### 2. 招待リンククリック
```
URL: app.domain.com/invite/[token]

表示内容:
┌────────────────────────────────────────┐
│ 〇〇組織への招待                        │
│                                        │
│ あなたは〇〇組織にメンバーとして        │
│ 招待されました。                        │
│                                        │
│ アカウントを作成して参加してください。  │
│                                        │
│ メールアドレス: user@company.com       │
│               （変更不可・グレー表示）  │
│                                        │
│ 名前:         [          ]             │
│ パスワード:   [          ]             │
│                                        │
│ [アカウントを作成して参加]              │
└────────────────────────────────────────┘

処理:
1. トークン検証
2. メールアドレス一致チェック
3. Supabase auth.signUp()
4. organization_members に追加
5. invitations を accepted に更新
6. リダイレクト → app.domain.com/
```

#### 3. ダッシュボード（参加完了）
```
URL: app.domain.com/

表示内容:
┌────────────────────────────────────────┐
│ ようこそ、〇〇組織                      │
│                                        │
│ あなたのロール: Member                 │
│                                        │
│ [ダッシュボードを見る]                 │
└────────────────────────────────────────┘
```

---

## 🔐 権限設計

### ロール階層

**OPS権限（独立システム）**
```
Ops（運用担当者）
└── 完全に独立した権限システム（user_metadata.is_ops）
    └── 全組織・全ユーザーを管理可能
```

**組織内権限（組織ベース）**
```
Owner（オーナー）
  ↓
Admin（管理者）
  ↓
Member（メンバー）
```

注: OPS権限とAPP/ADMIN権限は完全に独立しています。

### ロールと権限

#### Ops（運用管理者）← 新規追加
```
アクセス: ops.domain.com

権限:
- 🔧 全組織の閲覧・管理
- 🔧 全ユーザーの閲覧・管理
- 🔧 システム設定
- 🔧 監査ログ閲覧
- 🔧 使用量統計
- 🔧 組織の強制作成・削除
- 🔧 ライセンスの手動調整
- 🔧 IP制限設定

制限:
- OPS_ALLOWED_IPS環境変数でIP制限
- 特定のIPアドレスからのみアクセス可能
- 認証必須

用途:
- サービス運用者・管理者
- カスタマーサポート
- 技術サポート
```

#### Owner（オーナー）
```
アクセス: app.domain.com

権限:
- ✅ 組織内の全機能利用
- ✅ メンバー招待・削除
- ✅ メンバーのロール変更（Owner/Admin/Member）
- ✅ プラン変更・アップグレード
- ✅ 支払い情報変更
- ✅ 請求履歴閲覧
- ✅ 組織設定変更
- ✅ 組織削除

制限:
- 自分の組織のみアクセス可能
- 他組織は閲覧不可

対象:
- サインアップした企業管理者
- 組織ごとに1名以上
```

#### Admin（管理者）
```
アクセス: app.domain.com

権限:
- ✅ 組織内の全機能利用
- ✅ メンバー招待・削除
- ✅ メンバーのロール変更（Admin/Member）
- ✅ プラン閲覧のみ（変更不可）
- ❌ 支払い情報変更不可
- ❌ 組織削除不可

制限:
- Ownerのロール変更不可
- 支払い関連は閲覧のみ

対象:
- Ownerが昇格させたメンバー
```

#### Member（メンバー）
```
アクセス: app.domain.com

権限:
- ✅ 組織内の一般機能利用
- ✅ 自分のプロフィール編集
- ❌ メンバー招待不可
- ❌ 設定変更不可
- ❌ プラン閲覧不可

制限:
- 管理機能へのアクセス不可

対象:
- 招待されたユーザー
- 一般社員
```

---

### 権限チェックフロー

#### OPSドメインへのアクセス
```typescript
// middleware.ts
if (domain === 'ops') {
  // 1. IP制限チェック
  const clientIp = request.headers.get('x-forwarded-for')
  if (!allowedIps.includes(clientIp)) {
    return redirect('/unauthorized')
  }

  // 2. Ops権限チェック
  const { data: user } = await supabase.auth.getUser()
  if (!user || !user.user_metadata.is_ops) {
    return redirect('/login')
  }
}
```

#### APPドメインでの権限チェック
```typescript
// 例: メンバー招待
if (currentUserRole === 'member') {
  return { error: 'メンバー招待権限がありません' }
}

// 例: プラン変更
if (currentUserRole !== 'owner') {
  return { error: 'プラン変更はオーナーのみ可能です' }
}
```

---

## 📊 データベース設計

### 新規テーブル: organization_licenses
```sql
CREATE TABLE organization_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  plan_type TEXT NOT NULL, -- 'starter', 'business', 'pro', 'enterprise'
  total_seats INT NOT NULL, -- 契約シート数
  used_seats INT DEFAULT 0, -- 使用中シート数（自動計算）
  stripe_subscription_id TEXT, -- Stripe/Chargebee ID
  contract_start DATE NOT NULL,
  contract_end DATE, -- null = 継続中
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- トリガー: used_seatsを自動計算
CREATE OR REPLACE FUNCTION update_used_seats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organization_licenses
  SET used_seats = (
    SELECT COUNT(*)
    FROM organization_members
    WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
  ),
  updated_at = NOW()
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seats_on_member_insert
AFTER INSERT ON organization_members
FOR EACH ROW EXECUTE FUNCTION update_used_seats();

CREATE TRIGGER update_seats_on_member_delete
AFTER DELETE ON organization_members
FOR EACH ROW EXECUTE FUNCTION update_used_seats();
```

### profiles テーブル修正
```sql
-- 既存のprofilesテーブルに追加
ALTER TABLE profiles
ADD COLUMN company_name TEXT, -- サインアップ時に入力
ADD COLUMN name TEXT; -- サインアップ時に入力
```

---

## 🚀 実装優先度

### Phase 1: 必須機能（MVP）
1. ✅ サインアップフォーム修正（会社名・名前追加）
2. ✅ プラン選択ページ作成
3. ✅ Chargebee/Stripe決済統合
4. ✅ organization_licenses テーブル作成
5. ✅ メンバー招待時のライセンスチェック
6. ✅ 招待ユーザーのサインアップフロー修正

### Phase 2: 追加機能
1. プラン変更機能
2. 追加シート購入機能
3. 請求履歴表示
4. 使用量ダッシュボード

### Phase 3: エンタープライズ機能
1. SSO/SAML対応
2. IP制限
3. 監査ログエクスポート
4. カスタムブランディング

---

## 🎯 次のステップ

この仕様で実装を開始しますか？

または他に確認・修正したい点はありますか？
