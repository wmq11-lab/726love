'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, Images, Loader2, MapPin, Plus, Trash2, UploadCloud } from 'lucide-react';
import { reverseGeocodeClient } from '@/lib/amap';
import { compressImageFile } from '@/lib/compress-image';
import { MOOD_OPTIONS } from '@/lib/moods';
import { parsePhotoExif, resolvePhotoTakenAt } from '@/lib/photo-exif';
import {
  DEFAULT_PHOTO_GROUP_RADIUS_METERS,
  groupBatchPhotos,
  type BatchPhoto,
  type PhotoGroup,
} from '@/lib/photo-groups';
import {
  BATCH_UPLOAD_CONCURRENCY,
  MAX_BATCH_IMAGES,
  MAX_IMAGE_SIZE,
  MAX_IMAGE_SIZE_MB,
} from '@/lib/upload';
import { DEFAULT_ROLE, ROLE_OPTIONS } from '@/lib/roles';
import { RoleAvatar } from './role-avatar';

interface BatchUploadPanelProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
  onBusyChange?: (busy: boolean) => void;
}

interface BatchLocationDraft {
  enabled: boolean;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geocoding: boolean;
}

interface BatchProgress {
  running: boolean;
  uploaded: number;
  total: number;
  groupIndex: number;
  groupTotal: number;
  message: string;
}

type ApiResult<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

const emptyProgress: BatchProgress = {
  running: false,
  uploaded: 0,
  total: 0,
  groupIndex: 0,
  groupTotal: 0,
  message: '',
};

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`服务器返回异常 (${res.status}): ${text.slice(0, 80)}`);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        results[current] = await worker(items[current], current);
      }
    }),
  );

  return results;
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeRange(group: PhotoGroup): string {
  const start = formatTime(group.startDate);
  const end = formatTime(group.endDate);
  return start === end ? start : `${start} - ${end}`;
}

function makeInitialLocations(groups: PhotoGroup[]): Record<string, BatchLocationDraft> {
  return Object.fromEntries(
    groups.map((group) => [
      group.id,
      {
        enabled: group.latitude != null && group.longitude != null,
        name: '',
        address: '',
        latitude: group.latitude,
        longitude: group.longitude,
        geocoding: group.latitude != null && group.longitude != null,
      },
    ]),
  );
}

function buildBatchTitle(group: PhotoGroup, location?: BatchLocationDraft): string {
  const locationName = location?.enabled
    ? (location.name.trim() || location.address.trim() || '含 GPS')
    : '未定位';
  return `${formatShortDate(group.recordDate)} · ${locationName} · ${group.photos.length}张照片`.slice(0, 120);
}

export function BatchUploadPanel({ onSuccess, onNavigateHome, onBusyChange }: BatchUploadPanelProps) {
  const [photos, setPhotos] = useState<BatchPhoto[]>([]);
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [locations, setLocations] = useState<Record<string, BatchLocationDraft>>({});
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [moodTag, setMoodTag] = useState('日常');
  const [dragOver, setDragOver] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState({ done: 0, total: 0 });
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>(emptyProgress);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const geocodeRunRef = useRef(0);

  const selectedGroups = groups.filter((group) => selectedGroupIds.has(group.id));
  const selectedPhotoCount = selectedGroups.reduce((sum, group) => sum + group.photos.length, 0);
  const totalGpsCount = groups.reduce((sum, group) => sum + group.gpsCount, 0);
  const uploadPercent = progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0;

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
      geocodeRunRef.current += 1;
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(preparing || uploading);
  }, [onBusyChange, preparing, uploading]);

  useEffect(() => {
    return () => onBusyChange?.(false);
  }, [onBusyChange]);

  const createPreview = (file: File) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  };

  const resetBatch = () => {
    geocodeRunRef.current += 1;
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setPhotos([]);
    setGroups([]);
    setSelectedGroupIds(new Set());
    setLocations({});
    setProgress(emptyProgress);
    setPrepareProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = '';
  };

  const resolveGroupLocations = async (nextGroups: PhotoGroup[]) => {
    const runId = geocodeRunRef.current + 1;
    geocodeRunRef.current = runId;
    const gpsGroups = nextGroups.filter((group) => group.latitude != null && group.longitude != null);

    await mapWithConcurrency(gpsGroups, 2, async (group) => {
      if (group.latitude == null || group.longitude == null) return;
      try {
        const data = await reverseGeocodeClient(group.latitude, group.longitude);
        if (geocodeRunRef.current !== runId) return;
        setLocations((prev) => ({
          ...prev,
          [group.id]: {
            ...(prev[group.id] ?? {
              enabled: true,
              name: '',
              address: '',
              latitude: group.latitude,
              longitude: group.longitude,
              geocoding: true,
            }),
            enabled: true,
            name: data?.name || prev[group.id]?.name || '',
            address: data?.address || prev[group.id]?.address || '',
            latitude: group.latitude,
            longitude: group.longitude,
            geocoding: false,
          },
        }));
      } catch {
        if (geocodeRunRef.current !== runId) return;
        setLocations((prev) => ({
          ...prev,
          [group.id]: {
            ...(prev[group.id] ?? {
              enabled: true,
              name: '',
              address: '',
              latitude: group.latitude,
              longitude: group.longitude,
              geocoding: true,
            }),
            geocoding: false,
          },
        }));
      }
    });
  };

  const addBatchFiles = async (fileList: FileList | File[]) => {
    if (preparing || uploading) return;

    const incoming = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (incoming.length === 0) return;

    const remaining = MAX_BATCH_IMAGES - photos.length;
    if (remaining <= 0) {
      alert(`单次批量导入最多处理 ${MAX_BATCH_IMAGES} 张图片`);
      return;
    }

    const toAdd = incoming.slice(0, remaining);
    if (incoming.length > remaining) {
      alert(`最多还能添加 ${remaining} 张，已自动选取前 ${remaining} 张`);
    }

    const oversized = toAdd.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversized) {
      alert(`图片过大（${(oversized.size / 1024 / 1024).toFixed(1)}MB），请选择 ${MAX_IMAGE_SIZE_MB}MB 以内的图片`);
      return;
    }

    setPreparing(true);
    setPrepareProgress({ done: 0, total: toAdd.length });

    try {
      const newPhotos = await mapWithConcurrency(toAdd, 8, async (file) => {
        const exifInfo = await parsePhotoExif(file);
        const { capturedAt, source } = resolvePhotoTakenAt(file, exifInfo);
        setPrepareProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        return {
          id: createId('batch_photo'),
          file,
          preview: createPreview(file),
          exifInfo,
          capturedAt,
          timeSource: source,
        };
      });

      const nextPhotos = [...photos, ...newPhotos];
      const nextGroups = groupBatchPhotos(nextPhotos);
      const nextLocations = makeInitialLocations(nextGroups);
      setPhotos(nextPhotos);
      setGroups(nextGroups);
      setLocations(nextLocations);
      setSelectedGroupIds(new Set(nextGroups.map((group) => group.id)));
      void resolveGroupLocations(nextGroups);
    } finally {
      setPreparing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const createLocation = async (group: PhotoGroup): Promise<string | null> => {
    const location = locations[group.id];
    if (!location?.enabled || location.latitude == null || location.longitude == null) {
      return null;
    }

    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: location.name.trim() || location.address.slice(0, 20) || 'GPS 地点',
        address: location.address.trim() || `${location.latitude}, ${location.longitude}`,
        latitude: location.latitude,
        longitude: location.longitude,
        category: '记忆地点',
        description: '批量导入照片地点',
        visit_date: group.recordDate.toISOString(),
      }),
    });
    const json = await safeJson<ApiResult<{ id: string }>>(res);
    if (!json.success || !json.data?.id) {
      throw new Error(`地点保存失败: ${json.error || '未知错误'}`);
    }
    return json.data.id;
  };

  const createRecord = async (group: PhotoGroup, locationId: string | null): Promise<string> => {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: buildBatchTitle(group, locations[group.id]),
        content: '',
        mood_tag: moodTag,
        role,
        record_date: group.recordDate.toISOString(),
        location_id: locationId,
        tags: ['批量导入'],
      }),
    });
    const json = await safeJson<ApiResult<{ id: string }>>(res);
    if (!json.success || !json.data?.id) {
      throw new Error(`创建记录失败: ${json.error || '未知错误'}`);
    }
    return json.data.id;
  };

  const uploadPhoto = async (photo: BatchPhoto, recordId: string, sortOrder: number) => {
    const compressed = await compressImageFile(photo.file);
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('record_id', recordId);
    formData.append('template_style', 'simple');
    formData.append('sort_order', String(sortOrder));

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await safeJson<ApiResult<unknown>>(res);
    if (!json.success) {
      throw new Error(json.error || '图片上传失败');
    }

    setProgress((prev) => ({
      ...prev,
      uploaded: prev.uploaded + 1,
      message: `已上传 ${prev.uploaded + 1}/${prev.total} 张照片`,
    }));
  };

  const handleBatchSubmit = async () => {
    if (selectedGroups.length === 0 || uploading) return;

    setUploading(true);
    setSuccess(false);
    setProgress({
      running: true,
      uploaded: 0,
      total: selectedPhotoCount,
      groupIndex: 0,
      groupTotal: selectedGroups.length,
      message: '准备批量导入...',
    });

    try {
      for (let i = 0; i < selectedGroups.length; i++) {
        const group = selectedGroups[i];
        setProgress((prev) => ({
          ...prev,
          groupIndex: i + 1,
          message: `正在创建第 ${i + 1}/${selectedGroups.length} 组记忆`,
        }));
        const locationId = await createLocation(group);
        const recordId = await createRecord(group, locationId);

        await mapWithConcurrency(
          group.photos,
          BATCH_UPLOAD_CONCURRENCY,
          (photo, sortOrder) => uploadPhoto(photo, recordId, sortOrder),
        );
      }

      setSuccess(true);
      onSuccess();
      onNavigateHome();
      resetBatch();
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      alert('批量导入失败: ' + (err as Error).message);
    } finally {
      setUploading(false);
      setProgress((prev) => ({ ...prev, running: false }));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) void addBatchFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void addBatchFiles(event.target.files);
        }}
      />

      {groups.length === 0 ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="py-12 rounded-xl text-center cursor-pointer transition-all"
          style={{
            backgroundColor: dragOver ? '#F2C9C9' : '#FFFFFF',
            border: `2px dashed ${dragOver ? '#C4956A' : '#E8D5C4'}`,
          }}
        >
          <UploadCloud size={34} className="mx-auto mb-3" style={{ color: '#C4956A' }} />
          <p className="text-sm font-medium" style={{ color: '#C4956A' }}>批量拖入照片或点击选择</p>
          <p className="text-xs mt-1" style={{ color: '#A0846C' }}>
            最多 {MAX_BATCH_IMAGES} 张 · 单张最大 {MAX_IMAGE_SIZE_MB}MB · 按日期和 GPS 自动分组
          </p>
          <p className="text-xs mt-1" style={{ color: '#A0846C' }}>
            文字内容会默认留空，只保留照片、时间和地点
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}>
              <Images size={16} className="mx-auto mb-1" style={{ color: '#C4956A' }} />
              <div className="text-lg font-semibold" style={{ color: '#C4956A' }}>{photos.length}</div>
              <div className="text-[10px]" style={{ color: '#A0846C' }}>张照片</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}>
              <Calendar size={16} className="mx-auto mb-1" style={{ color: '#C4956A' }} />
              <div className="text-lg font-semibold" style={{ color: '#C4956A' }}>{groups.length}</div>
              <div className="text-[10px]" style={{ color: '#A0846C' }}>个分组</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}>
              <MapPin size={16} className="mx-auto mb-1" style={{ color: '#C4956A' }} />
              <div className="text-lg font-semibold" style={{ color: '#C4956A' }}>{totalGpsCount}</div>
              <div className="text-[10px]" style={{ color: '#A0846C' }}>张含 GPS</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={preparing || uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FFFFFF', color: '#C4956A', border: '1px solid #E8D5C4' }}
            >
              <Plus size={15} />
              继续添加
            </button>
            <button
              type="button"
              onClick={resetBatch}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FFFFFF', color: '#A0846C', border: '1px solid #E8D5C4' }}
            >
              <Trash2 size={15} />
              清空
            </button>
          </div>
        </>
      )}

      {preparing && (
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4', color: '#A0846C' }}>
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            正在读取照片信息 {prepareProgress.done}/{prepareProgress.total}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((group) => {
            const selected = selectedGroupIds.has(group.id);
            const location = locations[group.id];
            return (
              <div
                key={group.id}
                className="rounded-xl p-3 space-y-3 transition-opacity"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: selected ? '1.5px solid #C4956A' : '1px solid #E8D5C4',
                  opacity: selected ? 1 : 0.58,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: '#4A3728' }}>
                        {formatDateLabel(group.recordDate)}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFF8F0', color: '#C4956A' }}>
                        {group.photos.length} 张
                      </span>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: '#A0846C' }}>
                      {formatTimeRange(group)} · {group.gpsCount > 0 ? `${group.gpsCount} 张含 GPS` : '无 GPS'}
                      {group.fileTimeCount > 0 ? ` · ${group.fileTimeCount} 张使用文件时间` : ''}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0" style={{ color: '#A0846C' }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGroup(group.id)}
                      className="accent-[#C4956A]"
                    />
                    导入
                  </label>
                </div>

                <div className="flex items-start gap-2 text-xs" style={{ color: '#A0846C' }}>
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#C4956A' }} />
                  <div className="min-w-0">
                    {location?.geocoding ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        识别地点中...
                      </span>
                    ) : location?.enabled ? (
                      <>
                        <p className="truncate" style={{ color: '#4A3728' }}>{location.name || location.address || '识别中…'}</p>
                        {location.address && location.name && <p className="text-[10px] line-clamp-2">{location.address}</p>}
                      </>
                    ) : (
                      <span>没有 GPS 信息，将只按时间保存</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {group.photos.slice(0, 6).map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-lg overflow-hidden"
                      style={{ border: '1px solid #E8D5C4', backgroundColor: '#FFF8F0' }}
                    >
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {groups.length > 0 && (
        <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}>
          <div>
            <p className="text-xs mb-2" style={{ color: '#A0846C' }}>记录角色</p>
            <div className="flex gap-2">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setRole(option.label)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: role === option.label ? '#C4956A' : '#FFF8F0',
                    color: role === option.label ? '#FFFFFF' : '#4A3728',
                    border: `1px solid ${role === option.label ? '#C4956A' : '#E8D5C4'}`,
                  }}
                >
                  <RoleAvatar role={option.label} size={26} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs mb-2" style={{ color: '#A0846C' }}>批量心情</p>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.label}
                  type="button"
                  onClick={() => setMoodTag(mood.label)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    backgroundColor: moodTag === mood.label ? '#C4956A' : '#FFF8F0',
                    color: moodTag === mood.label ? '#FFFFFF' : '#4A3728',
                    border: `1px solid ${moodTag === mood.label ? '#C4956A' : '#E8D5C4'}`,
                  }}
                >
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {progress.running && (
        <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: '#A0846C' }}>
            <span>{progress.message}</span>
            <span>{uploadPercent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#FFF8F0' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${uploadPercent}%`, backgroundColor: '#C4956A' }}
            />
          </div>
          <p className="text-[10px]" style={{ color: '#A0846C' }}>
            第 {progress.groupIndex}/{progress.groupTotal} 组 · 并发 {BATCH_UPLOAD_CONCURRENCY} 张上传
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleBatchSubmit}
        disabled={uploading || preparing || selectedGroups.length === 0}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ backgroundColor: success ? '#A8D5A2' : '#C4956A', color: '#FFFFFF' }}
      >
        {uploading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            批量导入中...
          </>
        ) : success ? (
          <>
            <Check size={15} />
            导入成功
          </>
        ) : selectedPhotoCount > 0 ? (
          `批量导入 ${selectedGroups.length} 组 / ${selectedPhotoCount} 张`
        ) : (
          '选择要导入的分组'
        )}
      </button>

      {groups.length > 0 && (
        <p className="text-[10px] text-center" style={{ color: '#A0846C' }}>
          分组半径约 {DEFAULT_PHOTO_GROUP_RADIUS_METERS} 米；每组会生成一条没有文字内容的记忆
        </p>
      )}
    </div>
  );
}
