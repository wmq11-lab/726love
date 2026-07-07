export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logger } from '@/lib/logger';

// GET /api/anniversaries — 获取纪念日列表
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('anniversaries')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('[GET /api/anniversaries]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { title, date, description, type, icon } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, error: '标题和日期为必填项' }, { status: 400 });
    }

    const { data, error } = await client
      .from('anniversaries')
      .insert({
        title,
        date,
        description: description || '',
        type: type || '纪念日',
        icon: icon || 'heart',
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error('[POST /api/anniversaries]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
