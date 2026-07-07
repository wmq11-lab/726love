-- 写入恋爱重要日期（可重复执行：先删后插）
DELETE FROM anniversaries WHERE title IN ('我们在一起', '小张的生日', '王哥的生日');

INSERT INTO anniversaries (title, date, type, description, icon) VALUES
  ('我们在一起', '2023-07-26', '在一起', '2023 年 7 月 26 日，在一起的日子', 'heart'),
  ('小张的生日', '2001-07-26', '生日', '小张 · 2001 年 7 月 26 日', 'cake'),
  ('王哥的生日', '2004-06-05', '生日', '王哥 · 2004 年 6 月 5 日', 'cake');
