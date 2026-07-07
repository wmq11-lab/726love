import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — 检查环境变量与 Supabase 连通性 */
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

  const envOk =
    checks.COZE_SUPABASE_URL &&
    checks.COZE_SUPABASE_ANON_KEY &&
    checks.COZE_SUPABASE_SERVICE_ROLE_KEY;

  let supabaseOk = false;
  let supabaseError = '';

  if (envOk) {
    try {
      const client = getSupabaseClient();
      const { error } = await client.from('locations').select('id').limit(1);
      supabaseOk = !error;
      supabaseError = error?.message || '';
    } catch (err) {
      supabaseError = (err as Error).message;
    }
  }

  return NextResponse.json({
    success: envOk && supabaseOk,
    checks,
    supabaseOk,
    supabaseError: supabaseError || undefined,
    hint: !envOk
      ? '缺少 Supabase 环境变量'
      : !supabaseOk
        ? `Supabase 连接失败: ${supabaseError}`
        : '一切正常',
  });
}
