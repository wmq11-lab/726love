import { generateImageUrl } from '@/lib/storage';

type RawRecord = {
  id: string;
  record_date: string;
  mood_tag?: string;
  location_id?: string | null;
  locations?: { id: string; name: string } | null;
  record_images?: Array<{ id: string; storage_key: string; sort_order?: number }>;
  [key: string]: unknown;
};

/** 为记录列表补充图片签名 URL */
export async function enrichRecordsWithImages<T extends RawRecord>(records: T[]) {
  return Promise.all(records.map(async (record) => {
    const sortedImages = [...(record.record_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const images = await Promise.all(sortedImages.map(async (img) => {
      const key = img.storage_key;
      if (key?.startsWith('data:')) return { ...img, url: key };
      try {
        const url = await generateImageUrl(key, 86400);
        return url ? { ...img, url } : img;
      } catch {
        return img;
      }
    }));
    return { ...record, record_images: images };
  }));
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
