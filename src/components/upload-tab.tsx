'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MAX_IMAGE_SIZE, MAX_IMAGE_SIZE_MB, MAX_IMAGES_PER_RECORD } from '@/lib/upload';
import { MOOD_OPTIONS } from '@/lib/moods';
import { ROLE_OPTIONS, DEFAULT_ROLE } from '@/lib/roles';
import {
  searchPlacesClient,
  reverseGeocodeClient,
  resolvePlaceForSave,
  type PlaceSuggestion,
} from '@/lib/amap';
import { compressImageFile } from '@/lib/compress-image';
import { parsePhotoExif, toDatetimeLocalValue, type PhotoExifInfo } from '@/lib/photo-exif';
import { BatchUploadPanel } from './batch-upload-panel';
import { RoleAvatar } from './role-avatar';
import { TinyHeart } from './puppy-decoration';
import { Images, MapPin, Loader2, Pencil, Search, Calendar } from 'lucide-react';

interface UploadTabProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

interface PendingImage {
  id: string;
  file: File;
  preview: string;
  exifInfo: PhotoExifInfo | null;
}

interface LocationDraft {
  enabled: boolean;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geocoding: boolean;
  source: 'none' | 'gps' | 'search' | 'manual';
}

const emptyLocation = (): LocationDraft => ({
  enabled: false,
  name: '',
  address: '',
  latitude: null,
  longitude: null,
  geocoding: false,
  source: 'none',
});

function nowDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date());
}

export function UploadTab({ onSuccess, onNavigateHome }: UploadTabProps) {
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [batchBusy, setBatchBusy] = useState(false);
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState('日常');
  const [role, setRole] = useState<string>(DEFAULT_ROLE);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [location, setLocation] = useState<LocationDraft>(emptyLocation);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recordDateTime, setRecordDateTime] = useState(nowDatetimeLocal);
  const [dateFromExif, setDateFromExif] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationBoxRef = useRef<HTMLDivElement>(null);

  const moods = MOOD_OPTIONS;
  const modeSwitchDisabled = uploading || batchBusy;

  const readPreview = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = () => reject(new Error('预览读取失败'));
      reader.readAsDataURL(f);
    });

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    setLocation((prev) => ({ ...prev, geocoding: true }));

    try {
      const data = await reverseGeocodeClient(lat, lng);
      if (controller.signal.aborted) return;
      if (data) {
        setLocation((prev) => ({
          ...prev,
          enabled: true,
          name: data.name || prev.name,
          address: data.address || prev.address,
          latitude: lat,
          longitude: lng,
          geocoding: false,
          source: 'gps',
        }));
        setAddressQuery(data.address || data.name || '');
      } else {
        setLocation((prev) => ({
          ...prev,
          enabled: true,
          latitude: lat,
          longitude: lng,
          name: prev.name || '照片拍摄地',
          geocoding: false,
          source: 'gps',
        }));
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setLocation((prev) => ({
          ...prev,
          enabled: true,
          latitude: lat,
          longitude: lng,
          geocoding: false,
          source: 'gps',
        }));
      }
    }
  }, []);

  const addFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;

    const remaining = MAX_IMAGES_PER_RECORD - images.length;
    if (remaining <= 0) {
      alert(`每条记忆最多上传 ${MAX_IMAGES_PER_RECORD} 张图片`);
      return;
    }

    const toAdd = incoming.slice(0, remaining);
    if (incoming.length > remaining) {
      alert(`最多还能添加 ${remaining} 张，已自动选取前 ${remaining} 张`);
    }

    const oversized = toAdd.find((f) => f.size > MAX_IMAGE_SIZE);
    if (oversized) {
      alert(`图片过大（${(oversized.size / 1024 / 1024).toFixed(1)}MB），请选择 ${MAX_IMAGE_SIZE_MB}MB 以内的图片`);
      return;
    }

    const newImages = await Promise.all(
      toAdd.map(async (file) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: await readPreview(file),
        exifInfo: await parsePhotoExif(file),
      })),
    );

    setImages((prev) => [...prev, ...newImages]);

    // 从新增图片中找第一张带拍摄时间的，自动回填日期
    if (!dateTouched) {
      const datedImage = newImages.find((img) => img.exifInfo?.dateTime);
      if (datedImage?.exifInfo?.dateTime) {
        setRecordDateTime(toDatetimeLocalValue(new Date(datedImage.exifInfo.dateTime)));
        setDateFromExif(true);
      }
    }

    // 从新增图片中找第一张带 GPS 的，触发地点识别
    const gpsImage = newImages.find((img) => img.exifInfo?.latitude && img.exifInfo?.longitude);
    if (gpsImage?.exifInfo?.latitude && gpsImage.exifInfo?.longitude) {
      reverseGeocode(gpsImage.exifInfo.latitude, gpsImage.exifInfo.longitude);
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      const hasGps = next.some((img) => img.exifInfo?.latitude && img.exifInfo?.longitude);
      // 仅当地点来自 GPS 自动识别且已无 GPS 图片时清空
      if (!hasGps && location.source === 'gps') {
        setLocation(emptyLocation());
        setAddressQuery('');
      }
      return next;
    });
  };

  const searchAddress = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    try {
      let data = await searchPlacesClient(query);
      if (data.length === 0) {
        try {
          const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query.trim())}`, {
            signal: AbortSignal.timeout(10_000),
          });
          const json = (await res.json()) as { success?: boolean; data?: PlaceSuggestion[] };
          if (json.success && Array.isArray(json.data)) data = json.data;
        } catch {
          // 浏览器端已调高德；服务端仅作补充
        }
      }
      if (controller.signal.aborted) return;
      setSearchResults(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!addressQuery.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => searchAddress(addressQuery), 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [addressQuery, searchAddress]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (locationBoxRef.current && !locationBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectPlace = async (place: PlaceSuggestion) => {
    let latitude = place.latitude;
    let longitude = place.longitude;
    if (latitude == null || longitude == null) {
      const geocodeQuery = [place.district, place.name, place.address].filter(Boolean).join('') || place.name;
      const resolved = await resolvePlaceForSave(geocodeQuery);
      if (resolved?.latitude != null && resolved.longitude != null) {
        latitude = resolved.latitude;
        longitude = resolved.longitude;
      }
    }

    const fullAddress = [place.district, place.address].filter(Boolean).join('') || place.name;
    setLocation({
      enabled: true,
      name: place.name,
      address: fullAddress,
      latitude,
      longitude,
      geocoding: false,
      source: 'search',
    });
    setAddressQuery(fullAddress);
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const markManualEdit = () => {
    setLocation((prev) => ({
      ...prev,
      enabled: prev.enabled || !!(prev.latitude && prev.longitude) || !!prev.address.trim(),
      source: prev.source === 'gps' ? 'manual' : (prev.source === 'none' ? 'manual' : prev.source),
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setUploading(true);

    try {
      const title = content.trim()
        ? content.trim().slice(0, 20) + (content.trim().length > 20 ? '...' : '')
        : '无题';

      const recordDate = new Date(recordDateTime).toISOString();

      const safeJson = async (res: Response) => {
        const text = await res.text();
        try { return JSON.parse(text); }
        catch { throw new Error(`服务器返回异常 (${res.status}): ${text.slice(0, 80)}`); }
      };

      // 先创建地点（若启用）
      let locationId: string | null = null;
      let locData = { ...location, address: location.address || addressQuery.trim() };

      if (locData.enabled && locData.latitude == null && locData.address) {
        const resolved = await resolvePlaceForSave(locData.address);
        if (resolved) {
          locData = {
            ...locData,
            name: locData.name || resolved.name,
            address: [resolved.district, resolved.address].filter(Boolean).join('') || resolved.name,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
          };
        }
      }

      if (
        locData.enabled
        && locData.latitude == null
        && locData.address.trim()
      ) {
        alert('未能解析该地址的坐标，将仅保存文字记忆（不写入地图）。请检查高德 Key 或在搜索建议中点选地点。');
        locData = { ...locData, enabled: false };
      }

      if (locData.enabled && locData.latitude != null && locData.longitude != null) {
        const locRes = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: locData.name.trim() || locData.address.slice(0, 20) || '记忆地点',
            address: locData.address.trim(),
            latitude: locData.latitude,
            longitude: locData.longitude,
            category: '记忆地点',
            description: content.trim().slice(0, 50) || '记忆地点',
            visit_date: recordDate,
          }),
        });
        const locJson = await safeJson(locRes);
        if (!locJson.success) {
          alert('地点保存失败: ' + locJson.error);
          return;
        }
        locationId = locJson.data.id;
      }

      const recordRes = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: content.trim(),
          mood_tag: moodTag,
          role,
          record_date: recordDate,
          location_id: locationId,
          tags: [],
        }),
      });
      const recordJson = await safeJson(recordRes);
      if (!recordJson.success) {
        alert('创建失败: ' + recordJson.error);
        return;
      }
      const recordId = recordJson.data.id;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const compressed = await compressImageFile(img.file);
        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('record_id', recordId);
        formData.append('template_style', 'simple');
        formData.append('sort_order', String(i));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await safeJson(uploadRes);
        if (!uploadJson.success) {
          alert(`第 ${i + 1} 张图片上传失败: ${uploadJson.error}`);
          return;
        }
      }

      setSuccess(true);
      onSuccess();
      onNavigateHome();
      setTimeout(() => {
        setSuccess(false);
        setContent('');
        setImages([]);
        setLocation(emptyLocation());
        setAddressQuery('');
        setRecordDateTime(nowDatetimeLocal());
        setDateFromExif(false);
        setDateTouched(false);
        setRole(DEFAULT_ROLE);
      }, 1500);
    } catch (err) {
      alert('操作失败: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}>
        <h3 className="text-lg text-center mb-4 tracking-wide" style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}>
          记录此刻 💕
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setUploadMode('single')}
            disabled={modeSwitchDisabled}
            className="py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: uploadMode === 'single' ? '#C4956A' : '#FFFFFF',
              color: uploadMode === 'single' ? '#FFFFFF' : '#4A3728',
              border: `1px solid ${uploadMode === 'single' ? '#C4956A' : '#E8D5C4'}`,
            }}
          >
            <Pencil size={15} />
            普通记录
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('batch')}
            disabled={modeSwitchDisabled}
            className="py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: uploadMode === 'batch' ? '#C4956A' : '#FFFFFF',
              color: uploadMode === 'batch' ? '#FFFFFF' : '#4A3728',
              border: `1px solid ${uploadMode === 'batch' ? '#C4956A' : '#E8D5C4'}`,
            }}
          >
            <Images size={15} />
            批量导入
          </button>
        </div>

        {uploadMode === 'batch' ? (
          <BatchUploadPanel
            onSuccess={onSuccess}
            onNavigateHome={onNavigateHome}
            onBusyChange={setBatchBusy}
          />
        ) : (
          <>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
        />

        {images.length > 0 ? (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden" style={{ border: '2px solid #E8D5C4' }}>
                  <img src={img.preview} alt="预览" className="w-full h-full object-cover" />
                  {img.exifInfo?.latitude && (
                    <span className="absolute bottom-1 left-1 text-[9px] px-1 rounded" style={{ backgroundColor: 'rgba(196,149,106,0.85)', color: '#fff' }}>GPS</span>
                  )}
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs bg-white/90"
                    style={{ color: '#A0846C', border: '1px solid #E8D5C4' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES_PER_RECORD && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center text-xs"
                  style={{ border: '2px dashed #E8D5C4', color: '#C4956A', backgroundColor: '#FFFFFF' }}
                >
                  <span className="text-xl mb-1">+</span>
                  添加
                </button>
              )}
            </div>
            <p className="text-xs text-center" style={{ color: '#A0846C' }}>
              已选 {images.length}/{MAX_IMAGES_PER_RECORD} 张
            </p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="mb-4 py-10 rounded-xl text-center cursor-pointer transition-all"
            style={{
              backgroundColor: dragOver ? '#F2C9C9' : '#FFFFFF',
              border: `2px dashed ${dragOver ? '#C4956A' : '#E8D5C4'}`,
            }}
          >
            <div className="text-3xl mb-2">📸</div>
            <p className="text-sm" style={{ color: '#C4956A' }}>拖入照片或点击上传</p>
            <p className="text-xs mt-1" style={{ color: '#A0846C' }}>
              支持多张 · 最多 {MAX_IMAGES_PER_RECORD} 张 · 单张最大 {MAX_IMAGE_SIZE_MB}MB
            </p>
            <p className="text-xs mt-1" style={{ color: '#A0846C' }}>
              带 GPS 的照片将自动识别拍摄地点
            </p>
          </div>
        )}

        {/* 记忆日期 */}
        <div
          className="mb-4 rounded-xl p-4 space-y-2"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: '#C4956A' }} />
            <span className="text-sm font-medium" style={{ color: '#4A3728' }}>记忆日期</span>
            {dateFromExif && !dateTouched && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFF8F0', color: '#C4956A' }}>
                来自照片
              </span>
            )}
          </div>
          <input
            type="datetime-local"
            value={recordDateTime}
            onChange={(e) => {
              setRecordDateTime(e.target.value);
              setDateTouched(true);
              setDateFromExif(false);
            }}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
          />
          <p className="text-[10px]" style={{ color: '#A0846C' }}>
            默认为当前时间；上传带拍摄时间的照片会自动识别，也可手动修改
          </p>
        </div>

        {/* 记忆地点：自动识别 + 手动搜索 */}
        <div
          ref={locationBoxRef}
          className="mb-4 rounded-xl p-4 space-y-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} style={{ color: '#C4956A' }} />
              <span className="text-sm font-medium" style={{ color: '#4A3728' }}>记忆地点</span>
              {location.geocoding && (
                <span className="flex items-center gap-1 text-xs" style={{ color: '#A0846C' }}>
                  <Loader2 size={12} className="animate-spin" /> 识别中...
                </span>
              )}
              {location.source === 'gps' && !location.geocoding && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFF8F0', color: '#C4956A' }}>来自照片</span>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#A0846C' }}>
              <input
                type="checkbox"
                checked={location.enabled}
                onChange={(e) => setLocation((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="accent-[#C4956A]"
              />
              保存到地图
            </label>
          </div>

          {/* 地址搜索框 */}
          <div className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A0846C' }} />
              <input
                type="text"
                placeholder="搜索地址或地点，如「星巴克 王府井」"
                value={addressQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddressQuery(val);
                  setShowSuggestions(true);
                  setLocation((prev) => ({
                    ...prev,
                    address: val,
                    enabled: val.trim() ? true : prev.enabled,
                    source: prev.source === 'gps' && !val.trim() ? 'gps' : (val.trim() ? 'manual' : prev.source),
                  }));
                }}
                onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
              />
              {searching && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: '#A0846C' }} />
              )}
            </div>

            {showSuggestions && searchResults.length > 0 && (
              <ul
                className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-md max-h-48 overflow-y-auto"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}
              >
                {searchResults.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => selectPlace(place)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#FFF8F0] transition-colors"
                    >
                      <p className="text-sm truncate" style={{ color: '#4A3728' }}>{place.name}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: '#A0846C' }}>
                        {[place.district, place.address].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="text"
            placeholder="地点名称（展示用）"
            value={location.name}
            onChange={(e) => {
              markManualEdit();
              setLocation((prev) => ({ ...prev, enabled: true, name: e.target.value }));
            }}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              placeholder="纬度"
              value={location.latitude ?? ''}
              onChange={(e) => {
                markManualEdit();
                setLocation((prev) => ({
                  ...prev,
                  enabled: true,
                  latitude: e.target.value ? parseFloat(e.target.value) : null,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
            />
            <input
              type="number"
              step="any"
              placeholder="经度"
              value={location.longitude ?? ''}
              onChange={(e) => {
                markManualEdit();
                setLocation((prev) => ({
                  ...prev,
                  enabled: true,
                  longitude: e.target.value ? parseFloat(e.target.value) : null,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
            />
          </div>

          <p className="text-[10px]" style={{ color: '#A0846C' }}>
            上传带 GPS 的照片会自动回填地址；也可搜索或手动填写地点信息
          </p>
        </div>

        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下此刻想说的话..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4', color: '#4A3728',
              fontFamily: "'Noto Serif SC', serif", lineHeight: '1.8',
            }}
          />
        </div>

        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#A0846C' }}>记录角色</p>
          <div className="flex gap-2">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRole(r.label)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: role === r.label ? '#C4956A' : '#FFFFFF',
                  color: role === r.label ? '#FFFFFF' : '#4A3728',
                  border: `1px solid ${role === r.label ? '#C4956A' : '#E8D5C4'}`,
                }}
              >
                <RoleAvatar role={r.label} size={28} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#A0846C' }}>此刻心情</p>
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <button key={m.label} onClick={() => setMoodTag(m.label)}
                className="px-3 py-1.5 rounded-full text-sm transition-all"
                style={{
                  backgroundColor: moodTag === m.label ? '#C4956A' : '#FFFFFF',
                  color: moodTag === m.label ? '#FFFFFF' : '#4A3728',
                  border: `1px solid ${moodTag === m.label ? '#C4956A' : '#E8D5C4'}`,
                }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading || (!content.trim() && images.length === 0)}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: success ? '#A8D5A2' : '#C4956A', color: '#FFFFFF' }}
        >
          {uploading ? '保存中...' : success ? '保存成功! 🎉' : '发布记忆'}
        </button>
          </>
        )}
      </div>

      <div className="flex justify-center"><TinyHeart /></div>
    </div>
  );
}
