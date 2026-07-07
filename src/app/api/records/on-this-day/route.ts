export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { enrichRecordsWithImages, startOfToday, isSameMonthDay, yearsAgoFrom } from '@/lib/record-enrich';
import { logger } from '@/lib/logger';

/** GET /api/records/on-this-day — 历史上的今天（N 年前的今天） */
export async function GET() {
  try {
    const client = getSupabaseClient();
    const today = new Date();
    const todayStart = startOfToday();

    const { data, error } = await client
      .from('love_records')
      .select('*, locations(*), record_images(*)')
      .order('record_date', { ascending: false });

    if (error) throw new Error(error.message);

    const matches = (data ?? []).filter((r) => {
      const d = new Date(r.record_date);
      return isSameMonthDay(d, today) && d < todayStart;
    });

    const enriched = await enrichRecordsWithImages(matches);

    const groups = enriched
      .map((r) => ({
        ...r,
        yearsAgo: yearsAgoFrom(new Date(r.record_date), today),
      }))
      .sort((a, b) => b.yearsAgo - a.yearsAgo);

    return NextResponse.json({
      success: true,
      data: {
        dateLabel: today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
        groups,
      },
    });
  } catch (err) {
    logger.error('[GET /api/records/on-this-day]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
