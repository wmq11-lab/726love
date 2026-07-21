export interface PhotoExifInfo {
  dateTime?: string;
  latitude?: number;
  longitude?: number;
}

export type PhotoTimeSource = 'exif' | 'file';

function gpsToDecimal(gps: unknown, ref: unknown): number | undefined {
  if (!Array.isArray(gps) || gps.length < 3) return undefined;
  const degrees = Number(gps[0]);
  const minutes = Number(gps[1]);
  const seconds = Number(gps[2]);
  if (![degrees, minutes, seconds].every(Number.isFinite)) return undefined;

  const decimal = degrees + minutes / 60 + seconds / 3600;
  return ref === 'S' || ref === 'W' ? -decimal : decimal;
}

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

export function toDatetimeLocalValue(date: Date, withSeconds = false): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

function parseExifDate(value: unknown): string | undefined {
  if (value instanceof Date && isValidDate(value)) {
    return toDatetimeLocalValue(value, true);
  }

  if (typeof value !== 'string') return undefined;

  const exifMatch = value.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (exifMatch) {
    return `${exifMatch[1]}-${exifMatch[2]}-${exifMatch[3]}T${exifMatch[4]}:${exifMatch[5]}:${exifMatch[6]}`;
  }

  const parsed = new Date(value);
  return isValidDate(parsed) ? toDatetimeLocalValue(parsed, true) : undefined;
}

function parseNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export async function parsePhotoExif(file: File): Promise<PhotoExifInfo | null> {
  try {
    const exifr = await import('exifr');
    const data = await exifr.default.parse(file, {
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'latitude',
        'longitude',
      ],
    });

    if (!data || typeof data !== 'object') return null;

    const raw = data as Record<string, unknown>;
    const info: PhotoExifInfo = {};
    info.dateTime =
      parseExifDate(raw.DateTimeOriginal) ??
      parseExifDate(raw.CreateDate) ??
      parseExifDate(raw.ModifyDate);

    const latitude = parseNumber(raw.latitude) ?? gpsToDecimal(raw.GPSLatitude, raw.GPSLatitudeRef ?? 'N');
    const longitude = parseNumber(raw.longitude) ?? gpsToDecimal(raw.GPSLongitude, raw.GPSLongitudeRef ?? 'E');

    if (latitude != null && longitude != null) {
      info.latitude = latitude;
      info.longitude = longitude;
    }

    return Object.keys(info).length > 0 ? info : null;
  } catch {
    return null;
  }
}

export function resolvePhotoTakenAt(
  file: File,
  exifInfo: PhotoExifInfo | null,
): { capturedAt: Date; source: PhotoTimeSource } {
  if (exifInfo?.dateTime) {
    const capturedAt = new Date(exifInfo.dateTime);
    if (isValidDate(capturedAt)) {
      return { capturedAt, source: 'exif' };
    }
  }

  const fallback = file.lastModified ? new Date(file.lastModified) : new Date();
  return {
    capturedAt: isValidDate(fallback) ? fallback : new Date(),
    source: 'file',
  };
}
