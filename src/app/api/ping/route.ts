import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/ping — 最小存活探测（不依赖 Supabase） */
export async function GET() {
  return NextResponse.json({
    success: true,
    time: new Date().toISOString(),
    env: process.env.COZE_PROJECT_ENV || 'unset',
  });
}
