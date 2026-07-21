import type { PhotoExifInfo, PhotoTimeSource } from './photo-exif';

export const DEFAULT_PHOTO_GROUP_RADIUS_METERS = 500;

export interface BatchPhoto {
  id: string;
  file: File;
  preview: string;
  exifInfo: PhotoExifInfo | null;
  capturedAt: Date;
  timeSource: PhotoTimeSource;
}

export interface PhotoGroup {
  id: string;
  dateKey: string;
  photos: BatchPhoto[];
  recordDate: Date;
  startDate: Date;
  endDate: Date;
  latitude: number | null;
  longitude: number | null;
  gpsCount: number;
  fileTimeCount: number;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadius = 6371000;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildGroupId(group: Omit<PhotoGroup, 'id'>, index: number): string {
  const locationPart =
    group.latitude != null && group.longitude != null
      ? `${group.latitude.toFixed(3)}_${group.longitude.toFixed(3)}`
      : 'no_gps';

  return `${group.dateKey}_${locationPart}_${index}`;
}

function updateGroupBounds(group: Omit<PhotoGroup, 'id'>) {
  const sorted = [...group.photos].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  group.photos = sorted;
  group.recordDate = sorted[0]?.capturedAt ?? group.recordDate;
  group.startDate = sorted[0]?.capturedAt ?? group.startDate;
  group.endDate = sorted[sorted.length - 1]?.capturedAt ?? group.endDate;
  group.gpsCount = sorted.filter((p) => p.exifInfo?.latitude != null && p.exifInfo.longitude != null).length;
  group.fileTimeCount = sorted.filter((p) => p.timeSource === 'file').length;
}

function addPhotoToGroup(group: Omit<PhotoGroup, 'id'>, photo: BatchPhoto) {
  group.photos.push(photo);
  const gpsPhotos = group.photos.filter((p) => p.exifInfo?.latitude != null && p.exifInfo.longitude != null);
  if (gpsPhotos.length > 0) {
    group.latitude =
      gpsPhotos.reduce((sum, p) => sum + (p.exifInfo?.latitude ?? 0), 0) / gpsPhotos.length;
    group.longitude =
      gpsPhotos.reduce((sum, p) => sum + (p.exifInfo?.longitude ?? 0), 0) / gpsPhotos.length;
  }
  updateGroupBounds(group);
}

export function groupBatchPhotos(
  photos: BatchPhoto[],
  radiusMeters = DEFAULT_PHOTO_GROUP_RADIUS_METERS,
): PhotoGroup[] {
  const sortedPhotos = [...photos].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  const groups: Array<Omit<PhotoGroup, 'id'>> = [];

  for (const photo of sortedPhotos) {
    const dateKey = toDateKey(photo.capturedAt);
    const latitude = photo.exifInfo?.latitude;
    const longitude = photo.exifInfo?.longitude;

    let target: Omit<PhotoGroup, 'id'> | undefined;

    if (latitude != null && longitude != null) {
      target = groups.find((group) => {
        if (group.dateKey !== dateKey || group.latitude == null || group.longitude == null) return false;
        return haversineMeters(
          { latitude, longitude },
          { latitude: group.latitude, longitude: group.longitude },
        ) <= radiusMeters;
      });
    } else {
      target = groups.find(
        (group) => group.dateKey === dateKey && group.latitude == null && group.longitude == null,
      );
    }

    if (target) {
      addPhotoToGroup(target, photo);
      continue;
    }

    const group: Omit<PhotoGroup, 'id'> = {
      dateKey,
      photos: [photo],
      recordDate: photo.capturedAt,
      startDate: photo.capturedAt,
      endDate: photo.capturedAt,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      gpsCount: latitude != null && longitude != null ? 1 : 0,
      fileTimeCount: photo.timeSource === 'file' ? 1 : 0,
    };
    groups.push(group);
  }

  return groups
    .map((group, index) => ({ ...group, id: buildGroupId(group, index) }))
    .sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime());
}
