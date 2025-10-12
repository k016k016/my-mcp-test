# クロスプラットフォーム開発ガイド

このガイドでは、MacとWindows間でプロジェクトを行き来しながら開発する方法を説明します。

## 📋 概要

このプロジェクトはクロスプラットフォーム対応しており、Mac、Windows、Linuxのいずれでも開発可能です。
GitHubを介してコードを同期し、各マシンで同じ開発環境を構築できます。

## 🚀 Windows環境でのセットアップ手順

### 1. 前提条件の準備

以下をインストールしてください：

- **Node.js 18以上**
  - https://nodejs.org/ からダウンロード
  - インストール後、コマンドプロンプトで確認: `node --version`

- **Git**
  - https://git-scm.com/download/win からダウンロード
  - インストール後、確認: `git --version`

- **Claude Code**
  - https://claude.com/claude-code からダウンロード

### 2. GitHubリポジトリからクローン

#### Mac側で初回プッシュ（まだの場合）

```bash
cd /Volumes/ai00/mcp-test/my-mcp-test

# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Multi-tenant SaaS starter kit"

# GitHubリポジトリと接続
git remote add origin https://github.com/[あなたのユーザー名]/[リポジトリ名].git

# プッシュ
git push -u origin main
```

#### Windows側でクローン

```bash
# 任意のディレクトリでクローン
git clone https://github.com/[あなたのユーザー名]/[リポジトリ名].git

# プロジェクトディレクトリに移動
cd [リポジトリ名]
```

### 3. 依存関係のインストール

```bash
npm install
```

これで `node_modules` ディレクトリが作成され、すべての依存パッケージがインストールされます。

### 4. 環境変数の設定（重要！）

`.env.local` はgitignoreされているため、Windows側でも再度作成が必要です：

```bash
# 開発環境に切り替え
npm run env:dev

# .env.local が作成されるので、エディタで開く
```

`.env.local` を開いて、Mac側で設定した実際のAPIキーを設定してください。

**方法1: Mac側の `.env.local` を参照**
```bash
# Mac側で確認
cat .env.local
```

**方法2: ドキュメントから再設定**
`docs/SERVICES_ACCOUNT_SETUP.md` を参考に、取得したAPIキーを入力してください。

サービスアカウントは共通なので、同じAPIキーを使用できます。

### 5. 開発サーバーの起動

```bash
npm run dev
```

以下のURLでアクセス：
- http://localhost:3000 - マーケティングサイト
- http://app.localhost:3000 - ユーザーアプリ
- http://admin.localhost:3000 - 管理画面
- http://ops.localhost:3000 - 運用画面

## 🔄 日々の開発ワークフロー

### Mac側で作業後

```bash
# 変更をステージング
git add .

# コミット
git commit -m "機能追加: ○○の実装"

# GitHubにプッシュ
git push
```

### Windows側で作業開始時

```bash
# 最新のコードを取得
git pull

# package.jsonが更新された場合のみ
npm install
```

### Windows側で作業後

```bash
# 変更をステージング
git add .

# コミット
git commit -m "バグ修正: ○○の問題を解決"

# GitHubにプッシュ
git push
```

### Mac側で作業再開時

```bash
# 最新のコードを取得
git pull

# package.jsonが更新された場合のみ
npm install
```

## ✅ プラットフォーム間で自動的に同期されるもの

以下はGit経由で自動的に同期されます：

- ✅ ソースコード（すべての `.ts`, `.tsx`, `.js`, `.css` ファイル）
- ✅ 依存関係の定義（`package.json`, `package-lock.json`）
- ✅ 環境変数テンプレート（`.env.development`, `.env.staging`, `.env.production`）
- ✅ ドキュメント（`docs/` ディレクトリ）
- ✅ データベースマイグレーション（`supabase/migrations/`）
- ✅ 設定ファイル（`next.config.mjs`, `tsconfig.json`, など）

## ⚠️ 手動で設定が必要なもの

以下は各マシンで個別に設定が必要です：

### 1. `.env.local`（最重要）

実際のAPIキーや機密情報を含むため、gitignoreされています。

**設定方法**:
```bash
# 開発環境テンプレートをコピー
npm run env:dev

# .env.local を編集して実際の値を設定
# Mac側と同じAPIキーを使用してください
```

### 2. `node_modules`

依存パッケージのディレクトリです。gitignoreされています。

**設定方法**:
```bash
npm install
```

### 3. Claude Code設定

Claude Codeの設定やキャッシュは各マシンで独立しています。

## 🔧 プラットフォーム固有の考慮事項

### Windows特有の注意点

#### 1. パス区切り文字

- **Windows**: バックスラッシュ `\`
- **Mac/Linux**: スラッシュ `/`

Next.jsが自動的に対応するため、通常は問題ありません。

#### 2. 改行コード

- **Windows**: CRLF（`\r\n`）
- **Mac/Linux**: LF（`\n`）

Gitが自動変換するため、通常は問題ありません。

**推奨設定（Windows側で初回のみ実行）**:
```bash
git config --global core.autocrlf true
```

この設定により、以下が自動的に行われます：
- チェックアウト時: LF → CRLF に変換
- コミット時: CRLF → LF に変換

#### 3. ファイアウォール

Windows Defenderファイアウォールが、初回起動時にNode.jsのネットワークアクセスを許可するか確認する場合があります。

**対応方法**: 「アクセスを許可する」を選択してください。

#### 4. ポート使用状況

Windowsでポート3000がすでに使用されている場合：

```bash
# ポートを使用しているプロセスを確認
netstat -ano | findstr :3000

# プロセスを終了（タスクマネージャーを使用）
```

### Mac特有の注意点

#### 1. Xcode Command Line Tools

Gitやnpmの一部機能に必要です。

**インストール**:
```bash
xcode-select --install
```

#### 2. ファイルシステムの大文字小文字

- **Mac**: デフォルトでは大文字小文字を区別しない
- **Windows**: 大文字小文字を区別しない
- **Linux**: 大文字小文字を区別する

ファイル名は一貫した命名規則を使用してください。

## 🛠️ トラブルシューティング

### 問題1: `npm install` が失敗する

**原因**: Node.jsのバージョンが古い

**解決方法**:
```bash
# Node.jsのバージョン確認
node --version

# 18以上であることを確認
# 古い場合は、https://nodejs.org/ から最新版をインストール
```

### 問題2: `.env.local` が見つからない

**原因**: 環境変数ファイルが作成されていない

**解決方法**:
```bash
# 開発環境テンプレートをコピー
npm run env:dev

# .env.local を編集
```

### 問題3: `git push` が失敗する

**原因**: GitHubの認証が必要

**解決方法（Windows）**:
1. Git Credential Managerが自動的にインストールされている場合、ブラウザでGitHubにログイン
2. または、Personal Access Token（PAT）を使用

**Personal Access Tokenの作成**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 「Generate new token」をクリック
3. `repo` 権限を選択
4. トークンをコピー
5. パスワードの代わりにトークンを使用

### 問題4: Supabaseに接続できない

**原因**: `.env.local` のSupabase設定が正しくない

**解決方法**:
```bash
# .env.local を確認
cat .env.local

# 以下が正しく設定されているか確認
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 問題5: ポート3000がすでに使用されている

**Windows**:
```bash
# ポートを使用しているプロセスを確認
netstat -ano | findstr :3000

# タスクマネージャーでプロセスを終了
```

**Mac**:
```bash
# ポートを使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

## 📝 チェックリスト

### 初回セットアップ（Windows側）

- [ ] Node.js 18以上をインストール
- [ ] Gitをインストール
- [ ] Claude Codeをインストール
- [ ] GitHubからリポジトリをクローン
- [ ] `npm install` を実行
- [ ] `.env.local` を作成して設定
- [ ] `npm run dev` で開発サーバーを起動
- [ ] ブラウザで http://localhost:3000 にアクセスして確認

### 日々の作業開始時

- [ ] `git pull` で最新コードを取得
- [ ] `package.json` が更新されていたら `npm install` を実行
- [ ] `npm run dev` で開発サーバーを起動

### 作業終了時

- [ ] `git add .` で変更をステージング
- [ ] `git commit -m "コミットメッセージ"` でコミット
- [ ] `git push` でGitHubにプッシュ

## 🔗 関連ドキュメント

- **`SERVICES_ACCOUNT_SETUP.md`** - サービスアカウント作成手順（環境変数の取得方法）
- **`ENVIRONMENT_SETUP.md`** - 環境設定ガイド（開発/ステージング/本番）
- **`E2E_TESTING_GUIDE.md`** - E2Eテスト実行ガイド
- **`README.md`** - プロジェクト全体の概要

## 💡 ベストプラクティス

### 1. 頻繁にコミット

小さな変更ごとにコミットすることで、問題が発生した際に戻しやすくなります。

```bash
git add .
git commit -m "機能追加: ログイン画面のUIを改善"
git push
```

### 2. `.env.local` のバックアップ

`.env.local` は重要なファイルです。安全な場所にバックアップを保管してください。

**注意**: GitHubには**絶対にプッシュしない**でください。

### 3. 環境変数の同期

Mac側とWindows側で同じAPIキーを使用することで、開発環境を統一できます。

### 4. ブランチの活用

大きな機能追加時は、別ブランチで作業することを推奨します。

```bash
# 新しいブランチを作成
git checkout -b feature/new-feature

# 作業後、mainにマージ
git checkout main
git merge feature/new-feature
git push
```

## まとめ

**MacからWindowsへの移行は簡単です！**

1. Claude CodeをインストールしてGitHubからソースを持ってくる
2. `npm install` を実行
3. `.env.local` を作成（Mac側と同じAPIキーを設定）

この3ステップで、Windows環境でも同じように開発できます！

---

作成日: 2025-01-12
クロスプラットフォーム開発をサポート
