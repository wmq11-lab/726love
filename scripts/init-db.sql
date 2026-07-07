-- 恋爱手账 — 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

-- ============================================================
-- 1. 业务表
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  address varchar(500),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  description text,
  visit_date timestamptz,
  category varchar(50) DEFAULT '约会地点',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locations_category_idx ON locations (category);
CREATE INDEX IF NOT EXISTS locations_visit_date_idx ON locations (visit_date);

CREATE TABLE IF NOT EXISTS anniversaries (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  date timestamptz NOT NULL,
  description text,
  type varchar(50) NOT NULL DEFAULT '纪念日',
  icon varchar(50) DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS anniversaries_date_idx ON anniversaries (date);
CREATE INDEX IF NOT EXISTS anniversaries_type_idx ON anniversaries (type);

CREATE TABLE IF NOT EXISTS love_records (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  content text,
  mood_tag varchar(50),
  record_date timestamptz NOT NULL,
  location_id varchar(36) REFERENCES locations (id) ON DELETE SET NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS love_records_date_idx ON love_records (record_date);
CREATE INDEX IF NOT EXISTS love_records_mood_idx ON love_records (mood_tag);
CREATE INDEX IF NOT EXISTS love_records_location_idx ON love_records (location_id);
CREATE INDEX IF NOT EXISTS love_records_created_idx ON love_records (created_at);

CREATE TABLE IF NOT EXISTS record_images (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id varchar(36) NOT NULL REFERENCES love_records (id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  caption varchar(500),
  sort_order integer DEFAULT 0,
  template_style varchar(50) DEFAULT 'polaroid',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS record_images_record_idx ON record_images (record_id);
CREATE INDEX IF NOT EXISTS record_images_sort_idx ON record_images (sort_order);

CREATE TABLE IF NOT EXISTS wechat_chats (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name varchar(255) NOT NULL,
  sender varchar(100) NOT NULL,
  content text NOT NULL,
  chat_time timestamptz NOT NULL,
  record_id varchar(36) REFERENCES love_records (id) ON DELETE SET NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wechat_chats_contact_idx ON wechat_chats (contact_name);
CREATE INDEX IF NOT EXISTS wechat_chats_time_idx ON wechat_chats (chat_time);
CREATE INDEX IF NOT EXISTS wechat_chats_record_idx ON wechat_chats (record_id);
CREATE INDEX IF NOT EXISTS wechat_chats_sender_idx ON wechat_chats (sender);

CREATE TABLE IF NOT EXISTS health_check (
  id serial PRIMARY KEY,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. 行级安全（RLS）
-- 后端 API 使用 service_role_key 访问，可绕过 RLS
-- ============================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE wechat_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;
