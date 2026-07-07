import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateImageUrl } from '@/lib/storage';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LocRow = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
};

function parseLocation(raw: unknown): LocRow | null {
  const loc = (Array.isArray(raw) ? raw[0] : raw) as LocRow | null | undefined;
  if (!loc?.id || loc.latitude == null || loc.longitude == null) return null;
  return loc;
}

/** 地图 API 不返回超大 base64，避免 EdgeOne 响应体超限导致 500 */
async function resolveMarkerImageUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith('data:')) {
    return key.length <= 8000 ? key : null;
  }
  try {
    return await generateImageUrl(key, 86400);
  } catch {
    return null;
  }
}

/** GET /api/space/markers — 地图标记：按地点聚合带图片的记忆 */
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('love_records')
      .select('id, title, content, record_date, mood_tag, locations(*), record_images(id, storage_key, sort_order)')
      .not('location_id', 'is', null)
      .order('record_date', { ascending: false });

    if (error) throw new Error(error.message);

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
      try {
        const loc = parseLocation(record.locations);
        if (!loc) continue;

        const sortedImages = [...(record.record_images ?? [])].sort(
          (a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );

        const images: Array<{ id: string; url: string }> = [];
        for (const img of sortedImages.slice(0, 6)) {
          const url = await resolveMarkerImageUrl(img.storage_key as string);
          if (url) images.push({ id: img.id, url });
        }

        const recordItem = {
          id: record.id,
          title: record.title,
          content: (record.content || '').slice(0, 500),
          record_date: record.record_date,
          mood_tag: record.mood_tag || '日常',
          images,
        };

        const existing = markerMap.get(loc.id);
        if (existing) {
          existing.records.push(recordItem);
          existing.imageCount += sortedImages.length;
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
            imageCount: sortedImages.length,
          });
        }
      } catch (recordErr) {
        logger.warn('[GET /api/space/markers] skip record', record.id, recordErr);
      }
    }

    return NextResponse.json({ success: true, data: Array.from(markerMap.values()) });
  } catch (err) {
    logger.error('[GET /api/space/markers]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
