-- 为 love_records 增加角色字段（王哥 / 小张）
ALTER TABLE love_records
  ADD COLUMN IF NOT EXISTS role varchar(50) DEFAULT '王哥';

CREATE INDEX IF NOT EXISTS love_records_role_idx ON love_records (role);
