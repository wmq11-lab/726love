import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logger } from '@/lib/logger';

// GET /api/search — 全局搜索
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = request.nextUrl;
    const keyword = searchParams.get('keyword');
    const type = searchParams.get('type'); // records / locations / all

    if (!keyword) {
      return NextResponse.json({ success: false, error: '请提供搜索关键词' }, { status: 400 });
    }

    const results: Record<string, unknown[]> = {};

    // 搜索恋爱记录
    if (!type || type === 'records' || type === 'all') {
      const { data: records, error: rErr } = await client
        .from('love_records')
        .select('*, locations(*), record_images(*)')
        .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
        .order('record_date', { ascending: false })
        .limit(20);

      if (rErr) throw new Error(`搜索记录失败: ${rErr.message}`);
      results.records = records || [];
    }

    // 搜索地点
    if (!type || type === 'locations' || type === 'all') {
      const { data: locations, error: lErr } = await client
        .from('locations')
        .select('*')
        .or(`name.ilike.%${keyword}%,address.ilike.%${keyword}%,description.ilike.%${keyword}%`)
        .order('visit_date', { ascending: false })
        .limit(20);

      if (lErr) throw new Error(`搜索地点失败: ${lErr.message}`);
      results.locations = locations || [];
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    logger.error('[GET /api/search]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
