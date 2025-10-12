# PostGIS セットアップガイド

このガイドでは、Supabase上でPostGIS拡張機能を有効化する手順を説明します。

## PostGISとは

PostGISは、PostgreSQLに地理空間データ（位置情報）を扱う機能を追加する拡張機能です。
地図上の座標、距離計算、範囲検索などが可能になります。

## セットアップ手順

### 1. Supabaseダッシュボードにアクセス

1. [Supabase](https://app.supabase.com)にログイン
2. プロジェクトを選択

### 2. PostGIS拡張機能を有効化

#### 方法A: ダッシュボードから有効化（推奨）

1. 左側メニューから「Database」→「Extensions」を選択
2. 検索ボックスに「postgis」と入力
3. 「postgis」を見つけて、右側の「Enable」ボタンをクリック

#### 方法B: SQLエディタから有効化

1. 左側メニューから「SQL Editor」を選択
2. 以下のSQLを実行:

\`\`\`sql
-- PostGIS拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- 有効化されたか確認
SELECT PostGIS_version();
\`\`\`

### 3. PostGIS対応テーブルの作成例

位置情報を含むテーブルの作成例:

\`\`\`sql
-- 場所を保存するテーブル
CREATE TABLE places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- 位置情報カラム（経度・緯度）
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 位置情報に空間インデックスを作成（検索を高速化）
CREATE INDEX places_location_idx ON places USING GIST (location);

-- Row Level Security（RLS）を有効化
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能なポリシー
CREATE POLICY "Places are viewable by everyone"
  ON places FOR SELECT
  USING (true);

-- 認証済みユーザーのみが挿入可能なポリシー
CREATE POLICY "Authenticated users can insert places"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (true);
\`\`\`

### 4. TypeScript型定義の作成

\`\`\`typescript
// src/types/database.ts
export type Place = {
  id: string
  name: string
  description: string | null
  location: {
    type: 'Point'
    coordinates: [number, number] // [経度, 緯度]
  } | null
  created_at: string
}
\`\`\`

### 5. PostGIS関数の使用例

#### 5.1 場所を追加する

\`\`\`typescript
import { createClient } from '@/lib/supabase/server'

// 東京タワーの位置を追加
const supabase = await createClient()
const { data, error } = await supabase
  .from('places')
  .insert({
    name: '東京タワー',
    description: '東京のランドマーク',
    // ST_GeogFromText関数で位置情報を作成
    // POINT(経度 緯度) の形式
    location: 'POINT(139.7454 35.6586)',
  })
  .select()
\`\`\`

#### 5.2 近くの場所を検索する

\`\`\`typescript
// 特定の位置から1km以内の場所を検索
const { data, error } = await supabase
  .rpc('nearby_places', {
    lat: 35.6586,
    long: 139.7454,
    distance_meters: 1000,
  })
\`\`\`

上記のRPC関数を作成するSQL:

\`\`\`sql
-- 近くの場所を検索する関数
CREATE OR REPLACE FUNCTION nearby_places(
  lat FLOAT,
  long FLOAT,
  distance_meters INT DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    ST_Distance(
      p.location,
      ST_GeogFromText('POINT(' || long || ' ' || lat || ')')
    ) AS distance_meters
  FROM places p
  WHERE ST_DWithin(
    p.location,
    ST_GeogFromText('POINT(' || long || ' ' || lat || ')'),
    distance_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;
\`\`\`

#### 5.3 2点間の距離を計算する

\`\`\`sql
SELECT ST_Distance(
  ST_GeogFromText('POINT(139.7454 35.6586)'), -- 東京タワー
  ST_GeogFromText('POINT(139.7638 35.6812)')  -- 東京スカイツリー
) AS distance_meters;
-- 結果: 約3,400メートル
\`\`\`

## よく使うPostGIS関数

- **ST_GeogFromText()**: テキストから地理情報オブジェクトを作成
- **ST_Distance()**: 2点間の距離を計算（メートル単位）
- **ST_DWithin()**: 指定距離内かどうかを判定（範囲検索に使用）
- **ST_AsGeoJSON()**: 位置情報をGeoJSON形式に変換

## 参考リンク

- [PostGIS公式ドキュメント](https://postgis.net/documentation/)
- [Supabase PostGISガイド](https://supabase.com/docs/guides/database/extensions/postgis)
