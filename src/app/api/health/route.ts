import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — 检查关键环境变量是否已配置（不暴露具体值） */
export async function GET() {
  const checks = {
    COZE_SUPABASE_URL: Boolean(process.env.COZE_SUPABASE_URL),
    COZE_SUPABASE_ANON_KEY: Boolean(process.env.COZE_SUPABASE_ANON_KEY),
    COZE_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.COZE_SUPABASE_SERVICE_ROLE_KEY),
    COZE_BUCKET_ENDPOINT_URL: Boolean(process.env.COZE_BUCKET_ENDPOINT_URL),
    COZE_BUCKET_NAME: Boolean(process.env.COZE_BUCKET_NAME),
    COZE_BUCKET_ACCESS_KEY: Boolean(process.env.COZE_BUCKET_ACCESS_KEY),
    COZE_BUCKET_SECRET_KEY: Boolean(process.env.COZE_BUCKET_SECRET_KEY),
    COZE_PROJECT_ENV: process.env.COZE_PROJECT_ENV || '(未设置)',
    NEXT_PUBLIC_AMAP_KEY: Boolean(process.env.NEXT_PUBLIC_AMAP_KEY),
  };

  const requiredOk =
    checks.COZE_SUPABASE_URL &&
    checks.COZE_SUPABASE_ANON_KEY &&
    checks.COZE_SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    success: requiredOk,
    checks,
    hint: requiredOk
      ? 'Supabase 环境变量已配置'
      : '缺少 Supabase 环境变量，请在 EdgeOne 环境变量中配置并重新部署',
  });
}
