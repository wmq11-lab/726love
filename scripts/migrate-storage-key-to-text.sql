-- 将 record_images.storage_key 从 varchar(500) 扩展为 text
-- 已在 Supabase 建过表的项目，在 SQL Editor 执行此脚本

ALTER TABLE record_images
  ALTER COLUMN storage_key TYPE text;
