#!/bin/bash

echo "⏳ multiorg@example.com アカウントの作成を待機中..."
echo ""
echo "📝 以下の手順を実行してください:"
echo "   1. http://www.local.test:3000/signup でアカウント作成"
echo "      - メール: multiorg@example.com"
echo "      - パスワード: test1234"
echo "      - 氏名: Multi Org User"
echo "      - 会社名: Owner Organization"
echo ""
echo "   2. Supabase Dashboardで組織2を追加"
echo "      (詳細はターミナルに表示されている手順を参照)"
echo ""
echo "⏱️  30秒ごとに自動確認します..."
echo ""

MAX_ATTEMPTS=20
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "[$ATTEMPT/$MAX_ATTEMPTS] 確認中... ($(date '+%H:%M:%S'))"
  
  if node --env-file=.env.local scripts/check-multiorg-user.mjs 2>&1 | grep -q "Phase 1完了"; then
    echo ""
    echo "✅ Phase 1完了を検出しました！"
    echo "🚀 Phase 2に自動的に進みます..."
    exit 0
  fi
  
  sleep 30
  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "⏰ タイムアウト: ${MAX_ATTEMPTS}回確認しましたが、アカウントが見つかりませんでした"
echo "📝 手動で確認してください: node --env-file=.env.local scripts/check-multiorg-user.mjs"
exit 1
