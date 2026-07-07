import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateImageUrl } from '@/lib/storage';
import { logger } from '@/lib/logger';

/** GET /api/space/markers — 地图标记：按地点聚合带图片的记忆 */
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('love_records')
      .select('id, title, content, record_date, mood_tag, locations(*), record_images(*)')
      .not('location_id', 'is', null)
      .order('record_date', { ascending: false });

    if (error) throw new Error(error.message);

    type LocRow = {
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      category: string;
    };

    const markerMap = new Map<string, {
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      category: string;
      records: Array<{
        id: string;
        title: string;
        content: string;
        record_date: string;
        mood_tag: string;
        images: Array<{ id: string; url: string }>;
      }>;
      coverImage: string | null;
      imageCount: number;
    }>();

    for (const record of data ?? []) {
      const loc = record.locations as unknown as LocRow | null;
      if (!loc?.id) continue;

      const sortedImages = [...(record.record_images ?? [])].sort(
        (a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );

      const images: Array<{ id: string; url: string }> = [];
      for (const img of sortedImages) {
        const key = img.storage_key as string;
        const url = key?.startsWith('data:') ? key : await generateImageUrl(key, 86400);
        if (url) images.push({ id: img.id, url });
      }

      const existing = markerMap.get(loc.id);
      const recordItem = {
        id: record.id,
        title: record.title,
        content: record.content || '',
        record_date: record.record_date,
        mood_tag: record.mood_tag || '日常',
        images,
      };

      if (existing) {
        existing.records.push(recordItem);
        existing.imageCount += images.length;
        if (!existing.coverImage && images[0]) existing.coverImage = images[0].url;
      } else {
        markerMap.set(loc.id, {
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          latitude: loc.latitude,
          longitude: loc.longitude,
          category: loc.category || '记忆地点',
          records: [recordItem],
          coverImage: images[0]?.url ?? null,
          imageCount: images.length,
        });
      }
    }

    return NextResponse.json({ success: true, data: Array.from(markerMap.values()) });
  } catch (err) {
    logger.error('[GET /api/space/markers]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
