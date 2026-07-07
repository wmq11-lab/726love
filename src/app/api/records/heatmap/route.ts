export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logger } from '@/lib/logger';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** GET /api/records/heatmap?year=2026 — 按日聚合记录数量 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const year = parseInt(
      request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()),
      10,
    );

    const dateFrom = `${year}-01-01`;
    const dateTo = `${year}-12-31T23:59:59`;

    const { data, error } = await client
      .from('love_records')
      .select('record_date')
      .gte('record_date', dateFrom)
      .lte('record_date', dateTo);

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const key = toDateKey(new Date(row.record_date));
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const maxCount = Math.max(0, ...Object.values(counts));

    return NextResponse.json({
      success: true,
      data: { year, counts, maxCount, totalDays: Object.keys(counts).length },
    });
  } catch (err) {
    logger.error('[GET /api/records/heatmap]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
