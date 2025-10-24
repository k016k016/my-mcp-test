-- wiki_pagesテーブルと関連する関数・トリガーを削除
DROP TABLE IF EXISTS wiki_pages CASCADE;
DROP FUNCTION IF EXISTS update_wiki_page_search_vector() CASCADE;
DROP FUNCTION IF EXISTS search_wiki_pages(UUID, TEXT, INTEGER) CASCADE;
