import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logger } from '@/lib/logger';

// GET /api/records/[id] — 获取单条记录详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data, error } = await client
      .from('love_records')
      .select('*, locations(*), record_images(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('[GET /api/records/:id]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

// PUT /api/records/[id] — 更新记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { title, content, mood_tag, role, record_date, location_id, tags } = body;

    const { data, error } = await client
      .from('love_records')
      .update({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(mood_tag !== undefined && { mood_tag }),
        ...(role !== undefined && { role }),
        ...(record_date !== undefined && { record_date }),
        ...(location_id !== undefined && { location_id }),
        ...(tags !== undefined && { tags }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('[PUT /api/records/:id]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/records/[id] — 删除记录
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { error } = await client.from('love_records').delete().eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('[DELETE /api/records/:id]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
