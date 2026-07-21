import { buildThumbUrl, buildFullImageUrl, generateImageUrl } from '@/lib/storage';
import { isVideoMedia } from '@/lib/media';

type RawImage = {
  id: string;
  storage_key: string;
  sort_order?: number;
  template_style?: string | null;
  media_type?: string | null;
  [key: string]: unknown;
};

type RawRecord = {
  id: string;
  record_date: string;
  mood_tag?: string;
  location_id?: string | null;
  locations?: { id: string; name: string } | null;
  record_images?: RawImage[];
  [key: string]: unknown;
};

async function enrichOneImage(img: RawImage) {
  const key = img.storage_key;
  if (!key) return img;

  const video = isVideoMedia(img);
  if (key.startsWith('data:')) {
    return {
      ...img,
      url: key,
      fullUrl: key,
      media_type: video ? 'video' : 'image',
    };
  }

  if (video) {
    const signed = await generateImageUrl(key, 86400);
    const url = signed || key;
    return {
      ...img,
      url,
      fullUrl: url,
      media_type: 'video' as const,
      template_style: img.template_style || 'video',
    };
  }

  return {
    ...img,
    url: buildThumbUrl(key, 720),
    fullUrl: buildFullImageUrl(key, 1600),
    media_type: 'image' as const,
  };
}

/** 为记录列表补充媒体 URL：图片用缩略图，视频用签名直链 */
export async function enrichRecordsWithImages<T extends RawRecord>(records: T[]) {
  return Promise.all(
    records.map(async (record) => {
      const sortedImages = [...(record.record_images ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      const images = await Promise.all(sortedImages.map(enrichOneImage));
      return { ...record, record_images: images };
    }),
  );
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
