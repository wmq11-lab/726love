export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { enrichRecordsWithImages } from '@/lib/record-enrich';
import { logger } from '@/lib/logger';

// GET /api/records — 获取记录列表（支持搜索、筛选、分页）
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const mood = searchParams.get('mood');
    const keyword = searchParams.get('keyword');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const locationId = searchParams.get('locationId');
    const tag = searchParams.get('tag');

    let query = client.from('love_records').select('*, locations(*), record_images(*)', { count: 'exact' });

    if (mood) query = query.eq('mood_tag', mood);
    if (locationId) query = query.eq('location_id', locationId);
    if (dateFrom) query = query.gte('record_date', dateFrom);
    if (dateTo) query = query.lte('record_date', dateTo);
    if (keyword) query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
    if (tag) query = query.contains('tags', [tag]);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('record_date', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 列表用 /api/img 缩略图，避免服务端逐张签名 + 浏览器拉原图
    const enrichedData = await enrichRecordsWithImages(data ?? []);

    return NextResponse.json({ success: true, data: enrichedData, total: count ?? 0, page, limit });
  } catch (err) {
    logger.error('[GET /api/records]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/records — 创建新记录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { title, content, mood_tag, role, record_date, location_id, tags } = body;

    if (!title || !record_date) {
      return NextResponse.json({ success: false, error: '标题和日期为必填项' }, { status: 400 });
    }

    const { data, error } = await client
      .from('love_records')
      .insert({
        title,
        content: content || '',
        mood_tag: mood_tag || '日常',
        role: role || '王哥',
        record_date,
        location_id: location_id || null,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error('[POST /api/records]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
