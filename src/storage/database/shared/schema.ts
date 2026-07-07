import { pgTable, varchar, text, timestamp, integer, jsonb, index, doublePrecision, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================
// 纪念日表 — 记录恋爱中的重要日期
// ============================================================
export const anniversaries = pgTable(
  "anniversaries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).notNull().default("纪念日"),
    // type: 纪念日 / 生日 / 第一次 / 其他
    icon: varchar("icon", { length: 50 }).default("heart"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("anniversaries_date_idx").on(table.date),
    index("anniversaries_type_idx").on(table.type),
  ]
);

// ============================================================
// 恋爱记录表 — 时间维度的核心记录
// ============================================================
export const loveRecords = pgTable(
  "love_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    mood_tag: varchar("mood_tag", { length: 50 }),
    // mood_tag: 甜蜜 / 感动 / 开心 / 想念 / 生气 / 日常
    record_date: timestamp("record_date", { withTimezone: true }).notNull(),
    location_id: varchar("location_id", { length: 36 }).references(() => locations.id, {
      onDelete: "set null",
    }),
    tags: jsonb("tags").default(sql`'[]'::jsonb`),
    // tags: 自定义标签数组，如 ["约会", "电影", "旅行"]
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("love_records_date_idx").on(table.record_date),
    index("love_records_mood_idx").on(table.mood_tag),
    index("love_records_location_idx").on(table.location_id),
    index("love_records_created_idx").on(table.created_at),
  ]
);

// ============================================================
// 地理位置表 — 空间维度的地点记录
// ============================================================
export const locations = pgTable(
  "locations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    description: text("description"),
    visit_date: timestamp("visit_date", { withTimezone: true }),
    category: varchar("category", { length: 50 }).default("约会地点"),
    // category: 约会地点 / 第一次去 / 旅行 / 常去 / 其他
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("locations_category_idx").on(table.category),
    index("locations_visit_date_idx").on(table.visit_date),
  ]
);

// ============================================================
// 记录图片表 — 与恋爱记录关联的照片
// ============================================================
export const recordImages = pgTable(
  "record_images",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    record_id: varchar("record_id", { length: 36 }).notNull().references(() => loveRecords.id, {
      onDelete: "cascade",
    }),
    storage_key: text("storage_key").notNull(),
    caption: varchar("caption", { length: 500 }),
    sort_order: integer("sort_order").default(0),
    template_style: varchar("template_style", { length: 50 }).default("polaroid"),
    // template_style: polaroid / film / heart / simple / diary
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("record_images_record_idx").on(table.record_id),
    index("record_images_sort_idx").on(table.sort_order),
  ]
);

// ============================================================
// 微信聊天记录表 — 导入的聊天内容
// ============================================================
export const wechatChats = pgTable(
  "wechat_chats",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    contact_name: varchar("contact_name", { length: 255 }).notNull(),
    // 对话对象昵称/备注
    sender: varchar("sender", { length: 100 }).notNull(),
    // 发送者：我 / 对方
    content: text("content").notNull(),
    chat_time: timestamp("chat_time", { withTimezone: true }).notNull(),
    record_id: varchar("record_id", { length: 36 }).references(() => loveRecords.id, {
      onDelete: "set null",
    }),
    tags: jsonb("tags").default(sql`'[]'::jsonb`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("wechat_chats_contact_idx").on(table.contact_name),
    index("wechat_chats_time_idx").on(table.chat_time),
    index("wechat_chats_record_idx").on(table.record_id),
    index("wechat_chats_sender_idx").on(table.sender),
  ]
);

// ============================================================
// 系统表（必须保留）
// ============================================================
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});
