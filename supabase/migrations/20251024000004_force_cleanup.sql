-- 強制的にすべてのWiki関連オブジェクトを削除
DROP TRIGGER IF EXISTS update_wiki_pages_search_vector ON wiki_pages;
DROP FUNCTION IF EXISTS update_wiki_page_search_vector() CASCADE;
DROP FUNCTION IF EXISTS search_wiki_pages(UUID, TEXT, INTEGER) CASCADE;
DROP TABLE IF EXISTS wiki_pages CASCADE;
