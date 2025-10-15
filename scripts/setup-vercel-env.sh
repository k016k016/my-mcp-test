#!/bin/bash

# Vercelに環境変数を設定するスクリプト
# 使用方法: ./scripts/setup-vercel-env.sh [production|preview|development]

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Vercelに環境変数を設定します (環境: $ENVIRONMENT)"
echo ""

# .env.localファイルが存在するか確認
if [ ! -f .env.local ]; then
  echo "❌ .env.localファイルが見つかりません"
  exit 1
fi

# 環境変数のリスト（必須）
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

# 環境変数のリスト（オプション）
OPTIONAL_VARS=(
  "NEXT_PUBLIC_WWW_URL"
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_ADMIN_URL"
  "NEXT_PUBLIC_OPS_URL"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "CLOUDFLARE_R2_ACCESS_KEY_ID"
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY"
  "CLOUDFLARE_R2_BUCKET_NAME"
  "CLOUDFLARE_R2_ENDPOINT"
  "RESEND_API_KEY"
  "CHARGEBEE_SITE"
  "CHARGEBEE_API_KEY"
  "LOGFLARE_API_KEY"
  "LOGFLARE_SOURCE_TOKEN"
  "NEXT_PUBLIC_SENTRY_DSN"
  "SENTRY_AUTH_TOKEN"
  "OPS_ALLOWED_IPS"
)

# .env.localから環境変数を読み込む関数
get_env_value() {
  local var_name=$1
  local value=$(grep "^${var_name}=" .env.local | cut -d '=' -f 2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
  echo "$value"
}

# 環境変数をVercelに追加する関数
add_env_var() {
  local var_name=$1
  local var_value=$2
  local env=$3

  if [ -z "$var_value" ]; then
    echo "⏭️  $var_name: スキップ（値が空）"
    return
  fi

  echo "📝 $var_name を設定中..."

  # 既存の環境変数を削除（エラーを無視）
  vercel env rm "$var_name" "$env" --yes 2>/dev/null || true

  # 新しい環境変数を追加
  echo "$var_value" | vercel env add "$var_name" "$env" --force

  echo "✅ $var_name を設定しました"
}

echo "必須の環境変数を設定します..."
echo "================================"

for var_name in "${REQUIRED_VARS[@]}"; do
  var_value=$(get_env_value "$var_name")

  if [ -z "$var_value" ]; then
    echo "❌ エラー: $var_name が .env.local に設定されていません"
    exit 1
  fi

  add_env_var "$var_name" "$var_value" "$ENVIRONMENT"
done

echo ""
echo "オプションの環境変数を設定します..."
echo "================================"

for var_name in "${OPTIONAL_VARS[@]}"; do
  var_value=$(get_env_value "$var_name")
  add_env_var "$var_name" "$var_value" "$ENVIRONMENT"
done

echo ""
echo "✨ 環境変数の設定が完了しました！"
echo ""
echo "確認するには以下を実行してください:"
echo "  vercel env ls"
