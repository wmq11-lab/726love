import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateImageUrl } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { calcTogetherDays, LOVE_TOGETHER_DATE, parseDateOnly } from '@/lib/love-dates';

type Period = 'month' | 'year';

function inPeriod(dateStr: string, period: Period, year: number, month: number): boolean {
  const d = new Date(dateStr);
  if (period === 'year') return d.getFullYear() === year;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/** GET /api/report/love?period=month|year&year=&month= */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const period = (searchParams.get('period') || 'month') as Period;
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const client = getSupabaseClient();

    const [recordsRes] = await Promise.all([
      client.from('love_records').select('id, record_date, mood_tag, location_id, locations(id, name)'),
    ]);

    if (recordsRes.error) throw new Error(recordsRes.error.message);

    const allRecords = recordsRes.data ?? [];

    const startDate = parseDateOnly(LOVE_TOGETHER_DATE);
    const togetherDays = calcTogetherDays(now);

    const periodRecords = allRecords.filter((r) => inPeriod(r.record_date, period, year, month));

    // 心情统计
    const moodMap = new Map<string, number>();
    for (const r of periodRecords) {
      const mood = r.mood_tag || '日常';
      moodMap.set(mood, (moodMap.get(mood) ?? 0) + 1);
    }
    const totalInPeriod = periodRecords.length || 1;
    const moodStats = [...moodMap.entries()]
      .map(([mood, count]) => ({
        mood,
        count,
        percent: Math.round((count / totalInPeriod) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // 地点 TOP3
    const locMap = new Map<string, { id: string; name: string; count: number }>();
    for (const r of periodRecords) {
      const raw = r.locations;
      const loc = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null | undefined;
      if (!loc?.id) continue;
      const existing = locMap.get(loc.id);
      if (existing) existing.count += 1;
      else locMap.set(loc.id, { id: loc.id, name: loc.name, count: 1 });
    }
    const topLocations = [...locMap.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    // 精选照片：该时段内最多 9 张
    const periodIds = periodRecords.map((r) => r.id);
    let highlightPhotos: Array<{ id: string; url: string; record_id: string }> = [];

    if (periodIds.length > 0) {
      const { data: images } = await client
        .from('record_images')
        .select('id, storage_key, record_id, sort_order, created_at')
        .in('record_id', periodIds)
        .order('created_at', { ascending: false })
        .limit(30);

      for (const img of images ?? []) {
        if (highlightPhotos.length >= 9) break;
        const key = img.storage_key as string;
        let url = key?.startsWith('data:') ? key : await generateImageUrl(key, 86400);
        if (url) highlightPhotos.push({ id: img.id, url, record_id: img.record_id });
      }
    }

    const periodLabel = period === 'year'
      ? `${year} 年`
      : `${year} 年 ${month} 月`;

    const topMood = moodStats[0];

    return NextResponse.json({
      success: true,
      data: {
        period,
        periodLabel,
        togetherDays,
        togetherSince: startDate.toISOString(),
        totalRecords: allRecords.length,
        periodRecordCount: periodRecords.length,
        moodStats,
        topMoodPercent: topMood?.percent ?? 0,
        topMood: topMood?.mood ?? '—',
        topLocations,
        highlightPhotos,
      },
    });
  } catch (err) {
    logger.error('[GET /api/report/love]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
