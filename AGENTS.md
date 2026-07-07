# AGENTS.md — 恋爱手账（线条小狗主题）

## 项目概览

一款以「线条小狗」为主题的恋爱记录网页应用，支持图片上传、微信聊天记录导入、时间维度与空间维度的记录管理。

- **框架**：Next.js 16 (App Router) + React 19 + TypeScript 5
- **UI**：shadcn/ui + Tailwind CSS 4
- **数据库**：Supabase (PostgreSQL)，通过 Drizzle 定义 schema，Supabase SDK 执行 CRUD
- **存储**：S3 兼容对象存储 (coze-coding-dev-sdk)

## 构建与运行

```bash
# 开发环境
pnpm install
pnpm run dev

# 生产构建
pnpm run build
pnpm run start

# 类型检查
pnpm ts-check

# Lint
pnpm lint
```

## 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── records/          # 恋爱记录 CRUD
│   │   │   └── [id]/         # 单条记录操作
│   │   ├── upload/           # 图片上传 + 签名URL生成
│   │   ├── locations/        # 地理标签管理
│   │   ├── anniversaries/    # 纪念日管理
│   │   ├── chats/            # 微信聊天记录导入与查询
│   │   └── search/           # 全局搜索
│   ├── globals.css           # 全局样式 + 线条小狗主题
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 主页面（Tab 导航）
├── components/
│   ├── ui/                   # shadcn/ui 组件库
│   ├── puppy-decoration.tsx  # 线条小狗 SVG 装饰
│   ├── search-bar.tsx        # 搜索栏组件
│   ├── home-tab.tsx          # 首页 Tab
│   ├── timeline-tab.tsx      # 时间线 Tab
│   ├── space-tab.tsx         # 空间（地图）Tab
│   ├── upload-tab.tsx        # 记录/上传 Tab
│   ├── chat-tab.tsx          # 聊天记录 Tab
│   └── record-card.tsx       # 记录卡片组件
└── storage/database/
    ├── shared/schema.ts      # Drizzle 表结构定义
    └── supabase-client.ts    # Supabase 客户端
```

## 数据库表

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `love_records` | 恋爱记录 | title, content, mood_tag, record_date, location_id, tags |
| `record_images` | 记录图片 | record_id, storage_key, template_style |
| `locations` | 地理标签 | name, latitude, longitude, category |
| `anniversaries` | 纪念日 | title, date, type |
| `wechat_chats` | 微信聊天 | contact_name, sender, content, chat_time |

## 设计规范

详见 `DESIGN.md`。核心设计语言：
- 主色 `#C4956A`（小狗棕），背景 `#FEFAF5`（奶白）
- 字体：标题 ZCOOL KuaiLe，正文 Noto Serif SC
- 圆角、柔和阴影、手账风格

## 开发注意事项

- **Supabase CRUD**：所有操作必须检查 `{ data, error }` 并 throw error
- **RLS**：所有表已启用 RLS（场景A），后端使用 service_role_key
- **对象存储**：上传后使用返回的 key（非 fileName），通过 `generatePresignedUrl` 获取 URL
- **前端下载**：跨域文件使用 fetch + blob 模式
- **字段命名**：数据库字段使用 snake_case，TypeScript 接口使用 camelCase（映射）
