# Next.js プロジェクトテンプレート

このテンプレートは、**ドキュメント駆動開発**を実践するためのNext.jsプロジェクトテンプレートです。

---

## 🚀 使い方

### 1. このテンプレートをコピーして新プロジェクト名にリネーム

```bash
cp -r next-plan my-todo
cd my-todo
```

### 2. Next.jsプロジェクトを初期化

```bash
npx create-next-app@latest . --typescript --tailwind --app
```

### 3. hostsファイルを設定（重要）

ローカル開発で`.local.test`ドメインを使用するために、hostsファイルを設定します。

```bash
# macOS / Linux
sudo nano /etc/hosts

# 以下を追加
127.0.0.1 local.test
127.0.0.1 www.local.test
127.0.0.1 app.local.test
127.0.0.1 admin.local.test
127.0.0.1 ops.local.test
```

**重要**: これを設定しないと、Cookie共有が機能せず認証が正しく動作しません。

### 4. 環境変数を設定

```bash
# .env.exampleをコピー
cp .env.example .env.local

# 必要に応じて編集
# DATABASE_URL、API_KEYなどを追加
```

### 5. 完成！

```
my-todo/
├── docs/              # このテンプレートの内容
│   ├── patterns/
│   ├── checklists/
│   ├── decisions/
│   ├── troubleshooting/
│   └── test-data/
├── app/               # Next.jsアプリ
├── components/
├── CLAUDE.md
└── ...
```

---

## 📚 詳細ドキュメント

詳しい使い方やテンプレートの説明は、[docs/README.md](./docs/README.md)を参照してください。

---

## 🎯 このテンプレートの目的

- **実装前に必ずパターンを確認**させる
- **チェックリストで抜け漏れを防ぐ**
- **決定の背景を記録**し、同じ議論を繰り返さない
- **トラブルを素早く解決**できるガイドを提供

**「同じ失敗を繰り返さず、過去の学びを確実に適用できる」状態を実現する**

---

このテンプレートは、実際のプロジェクトで以下の問題に直面した経験から生まれました：

- 同じ問題を2回解決（Server Action redirect()問題）
- E2Eテストの不安定性を何度も修正
- TDDを忘れて後からテスト追加
- テストデータ設計が行き当たりばったり

これらの**反省を活かし、次のプロジェクトでは同じ過ちを繰り返さない**ために作成されました。
