import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logger } from '@/lib/logger';

// GET /api/locations — 获取地点列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');

    let query = client.from('locations').select('*').order('visit_date', { ascending: false });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('[GET /api/locations]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { name, address, latitude, longitude, description, visit_date, category } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ success: false, error: '名称和坐标为必填项' }, { status: 400 });
    }

    const { data, error } = await client
      .from('locations')
      .insert({
        name,
        address: address || '',
        latitude,
        longitude,
        description: description || '',
        visit_date: visit_date || new Date().toISOString(),
        category: category || '约会地点',
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error('[POST /api/locations]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
