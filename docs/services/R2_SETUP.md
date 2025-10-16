# Cloudflare R2 セットアップガイド

このガイドでは、Cloudflare R2（オブジェクトストレージサービス）をNext.jsアプリケーションで使用するための設定手順を説明します。

## Cloudflare R2とは

Cloudflare R2は、S3互換のオブジェクトストレージサービスです。
画像、動画、ドキュメントなどの静的ファイルを保存するのに適しています。
S3と互換性があるため、AWS SDKを使用してアクセスできます。

## 前提条件

- Cloudflareアカウント（[https://dash.cloudflare.com](https://dash.cloudflare.com)で作成）
- R2サブスクリプション（無料プランあり）

## 1. R2バケットの作成

1. [Cloudflareダッシュボード](https://dash.cloudflare.com)にログイン
2. 左側メニューから「R2」を選択
3. 「Create bucket」をクリック
4. バケット名を入力（例: `my-app-files`）
5. 「Create bucket」をクリック

## 2. APIトークンの作成

1. R2ダッシュボードで「Manage R2 API Tokens」をクリック
2. 「Create API token」をクリック
3. トークン名を入力（例: `my-app-token`）
4. Permissions（権限）を選択:
   - 「Object Read & Write」を選択（読み書き両方）
   - または「Object Read」のみ（読み取り専用）
5. 「Create API Token」をクリック
6. 表示される以下の情報をコピー:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID**（R2の設定ページに表示）

⚠️ **重要**: Secret Access Keyは一度しか表示されないため、必ず保存してください！

## 3. 環境変数の設定

`.env.local`ファイルに以下の値を設定します:

\`\`\`bash
# R2アカウントID
R2_ACCOUNT_ID=your-account-id

# R2アクセスキーID
R2_ACCESS_KEY_ID=your-access-key-id

# R2シークレットアクセスキー
R2_SECRET_ACCESS_KEY=your-secret-access-key

# R2バケット名
R2_BUCKET_NAME=your-bucket-name
\`\`\`

## 4. 公開アクセスの設定（オプション）

ファイルを一般公開したい場合は、カスタムドメインを設定します。

### 4.1 カスタムドメインの設定

1. R2バケットの設定ページを開く
2. 「Settings」タブを選択
3. 「Public access」セクションで「Connect Domain」をクリック
4. カスタムドメインを入力（例: `files.example.com`）
5. DNSレコードを設定（Cloudflareが自動で行う場合もあります）

### 4.2 環境変数に追加

\`\`\`bash
# R2公開URLのドメイン
R2_PUBLIC_URL=https://files.example.com
\`\`\`

## 5. プロジェクト構成

以下のファイルが作成されています:

- **src/lib/r2/client.ts**: R2クライアントの初期化
- **src/lib/r2/operations.ts**: ファイル操作関数群
- **src/lib/r2/index.ts**: エクスポート用エントリーポイント

## 6. 使用方法

### 6.1 ファイルをアップロードする

\`\`\`typescript
import { uploadFile } from '@/lib/r2'

// Server ActionやRoute Handlerで使用
export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File
  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await uploadFile(
    \`uploads/\${Date.now()}-\${file.name}\`, // ファイルのキー（パス）
    buffer,
    {
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    }
  )

  console.log('アップロード完了:', result.key)
  return result
}
\`\`\`

### 6.2 ファイルを取得する

\`\`\`typescript
import { getFile } from '@/lib/r2'

export async function downloadFile(key: string) {
  const file = await getFile(key)

  // ファイルの内容をストリームとして取得
  return new Response(file.body, {
    headers: {
      'Content-Type': file.contentType || 'application/octet-stream',
    },
  })
}
\`\`\`

### 6.3 ファイル一覧を取得する

\`\`\`typescript
import { listFiles } from '@/lib/r2'

export async function getFileList() {
  const result = await listFiles({
    prefix: 'uploads/', // 特定のフォルダ内のファイルのみ
    maxKeys: 100, // 最大取得数
  })

  console.log('ファイル数:', result.files.length)
  result.files.forEach((file) => {
    console.log(\`- \${file.key} (\${file.size} bytes)\`)
  })

  return result
}
\`\`\`

### 6.4 ファイルを削除する

\`\`\`typescript
import { deleteFile } from '@/lib/r2'

export async function removeFile(key: string) {
  await deleteFile(key)
  console.log('削除完了:', key)
}
\`\`\`

### 6.5 署名付きURL（一時的なアクセス）

\`\`\`typescript
import { generatePresignedUrl } from '@/lib/r2'

// ファイルへの一時的なアクセスURLを生成（1時間有効）
export async function getTemporaryUrl(key: string) {
  const url = await generatePresignedUrl(key, 3600) // 3600秒 = 1時間
  return url
}
\`\`\`

### 6.6 クライアント側からのアップロード

\`\`\`typescript
import { generatePresignedUploadUrl } from '@/lib/r2'

// Server Action: 署名付きアップロードURLを生成
export async function getUploadUrl(fileName: string, contentType: string) {
  const key = \`uploads/\${Date.now()}-\${fileName}\`
  const url = await generatePresignedUploadUrl(key, 3600, contentType)

  return { url, key }
}

// Client Component: 直接R2にアップロード
async function uploadFromClient(file: File) {
  // 署名付きURLを取得
  const { url, key } = await getUploadUrl(file.name, file.type)

  // R2に直接アップロード
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (response.ok) {
    console.log('アップロード成功:', key)
  }
}
\`\`\`

## 7. Route Handlerの例

画像アップロードAPIの実装例:

\`\`\`typescript
// src/app/api/upload/route.ts
import { uploadFile } from '@/lib/r2'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルがありません' },
        { status: 400 }
      )
    }

    // ファイルをバッファに変換
    const buffer = Buffer.from(await file.arrayBuffer())

    // R2にアップロード
    const result = await uploadFile(
      \`uploads/\${Date.now()}-\${file.name}\`,
      buffer,
      {
        contentType: file.type,
      }
    )

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
    })
  } catch (error) {
    console.error('アップロードエラー:', error)
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    )
  }
}
\`\`\`

## 8. 料金について

Cloudflare R2の料金体系:

- **ストレージ**: 10GB/月まで無料、それ以降は$0.015/GB/月
- **Class A操作**（書き込み・リスト）: 100万回/月まで無料
- **Class B操作**（読み取り）: 1000万回/月まで無料
- **データ転送**: 完全無料（egress料金なし）

⚠️ S3と比較して、データ転送料金がかからないのが大きな利点です。

## 9. ベストプラクティス

### 9.1 ファイル名の命名規則

\`\`\`typescript
// タイムスタンプとUUIDを組み合わせる
import { randomUUID } from 'crypto'

const key = \`uploads/\${Date.now()}-\${randomUUID()}-\${file.name}\`
\`\`\`

### 9.2 CORS設定（ブラウザから直接アクセスする場合）

R2バケットの設定でCORSを有効化:

\`\`\`json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
\`\`\`

### 9.3 ファイルサイズの制限

\`\`\`typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error('ファイルサイズが大きすぎます')
}
\`\`\`

## 10. トラブルシューティング

### 環境変数が読み込まれない

- 開発サーバーを再起動してください
- `.env.local`ファイルが正しい場所にあることを確認

### アップロードエラー

- APIトークンの権限を確認（Read & Write）
- バケット名が正しいか確認
- ファイルサイズがR2の制限内か確認（最大5TB/オブジェクト）

### CORSエラー

- R2バケットのCORS設定を確認
- 署名付きURLを使用している場合は、Content-Typeヘッダーが一致しているか確認

## 参考リンク

- [Cloudflare R2公式ドキュメント](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
