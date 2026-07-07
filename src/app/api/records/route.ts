export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateImageUrl } from '@/lib/storage';
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

    // 为每条记录的图片生成签名 URL
    const enrichedData = await Promise.all((data ?? []).map(async (record) => {
      const sortedImages = [...(record.record_images ?? [])].sort(
        (a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      const images = await Promise.all(sortedImages.map(async (img: { id: string; storage_key: string; template_style: string; caption?: string }) => {
        const key = img.storage_key;
        // base64 data URL 直接作为 url，无需签名
        if (key && key.startsWith('data:')) {
          return { ...img, url: key };
        }
        try {
          const signedUrl = await generateImageUrl(key, 86400);
          return signedUrl ? { ...img, url: signedUrl } : img;
        } catch {
          return img;
        }
      }));
      return { ...record, record_images: images };
    }));

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
