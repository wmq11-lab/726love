import { buildThumbUrl, buildFullImageUrl } from '@/lib/storage';

type RawRecord = {
  id: string;
  record_date: string;
  mood_tag?: string;
  location_id?: string | null;
  locations?: { id: string; name: string } | null;
  record_images?: Array<{ id: string; storage_key: string; sort_order?: number }>;
  [key: string]: unknown;
};

/** 为记录列表补充图片 URL：列表用缩略图，灯箱用较大图 */
export async function enrichRecordsWithImages<T extends RawRecord>(records: T[]) {
  return records.map((record) => {
    const sortedImages = [...(record.record_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const images = sortedImages.map((img) => {
      const key = img.storage_key;
      if (!key) return img;
      if (key.startsWith('data:')) return { ...img, url: key, fullUrl: key };
      return {
        ...img,
        url: buildThumbUrl(key, 720),
        fullUrl: buildFullImageUrl(key, 1600),
      };
    });
    return { ...record, record_images: images };
  });
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function yearsAgoFrom(date: Date, ref = new Date()): number {
  return ref.getFullYear() - date.getFullYear();
}
