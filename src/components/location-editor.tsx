'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import {
  resolvePlaceForSave,
  searchPlacesClient,
  type PlaceSuggestion,
} from '@/lib/amap';

export interface LocationDraft {
  enabled: boolean;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geocoding: boolean;
  source: 'none' | 'gps' | 'search' | 'manual';
  id?: string | null;
}

interface LocationEditorProps {
  value: LocationDraft;
  onChange: (next: LocationDraft | ((prev: LocationDraft) => LocationDraft)) => void;
  addressQuery: string;
  onAddressQueryChange: (value: string) => void;
  helperText?: string;
}

export const emptyLocation = (): LocationDraft => ({
  enabled: false,
  name: '',
  address: '',
  latitude: null,
  longitude: null,
  geocoding: false,
  source: 'none',
  id: null,
});

export function LocationEditor({
  value,
  onChange,
  addressQuery,
  onAddressQueryChange,
  helperText = '上传带 GPS 的照片会自动回填地址；也可搜索或手动填写地点信息',
}: LocationEditorProps) {
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationBoxRef = useRef<HTMLDivElement>(null);

  const updateLocation = (next: LocationDraft | ((prev: LocationDraft) => LocationDraft)) => {
    onChange(next);
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
    setShowSuggestions(false);
    setSearching(true);
    updateLocation((prev) => ({
      ...prev,
      enabled: true,
      name: place.name,
      geocoding: true,
      source: 'search',
    }));

    const fullAddress = [place.district, place.address].filter(Boolean).join('') || place.name;
    let latitude = place.latitude;
    let longitude = place.longitude;

    if (
      typeof latitude !== 'number'
      || typeof longitude !== 'number'
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
    ) {
      const geocodeQuery = [place.district, place.name, place.address].filter(Boolean).join(' ') || place.name;
      const resolved = await resolvePlaceForSave(geocodeQuery);
      if (
        resolved
        && typeof resolved.latitude === 'number'
        && typeof resolved.longitude === 'number'
        && Number.isFinite(resolved.latitude)
        && Number.isFinite(resolved.longitude)
      ) {
        latitude = resolved.latitude;
        longitude = resolved.longitude;
      }
    }

    setSearching(false);

    if (
      typeof latitude !== 'number'
      || typeof longitude !== 'number'
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
    ) {
      updateLocation((prev) => ({
        ...prev,
        enabled: true,
        name: place.name,
        address: fullAddress,
        latitude: null,
        longitude: null,
        geocoding: false,
        source: 'search',
      }));
      onAddressQueryChange(fullAddress);
      setSearchResults([]);
      alert('该推荐项暂无精确坐标，请换一个建议，或手动填写经纬度后再保存到地图。');
      return;
    }

    updateLocation((prev) => ({
      ...prev,
      enabled: true,
      name: place.name,
      address: fullAddress,
      latitude,
      longitude,
      geocoding: false,
      source: 'search',
    }));
    onAddressQueryChange(fullAddress);
    setSearchResults([]);
  };

  const markManualEdit = () => {
    updateLocation((prev) => ({
      ...prev,
      enabled: prev.enabled || !!(prev.latitude && prev.longitude) || !!prev.address.trim(),
      source: prev.source === 'gps' ? 'manual' : (prev.source === 'none' ? 'manual' : prev.source),
    }));
  };

  return (
    <div
      ref={locationBoxRef}
      className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={16} style={{ color: '#C4956A' }} />
          <span className="text-sm font-medium" style={{ color: '#4A3728' }}>记忆地点</span>
          {value.geocoding && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#A0846C' }}>
              <Loader2 size={12} className="animate-spin" /> 识别中...
            </span>
          )}
          {value.source === 'gps' && !value.geocoding && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFF8F0', color: '#C4956A' }}>来自照片</span>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#A0846C' }}>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => updateLocation((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="accent-[#C4956A]"
          />
          保存到地图
        </label>
      </div>

      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A0846C' }} />
          <input
            type="text"
            placeholder="搜索地址或地点，如「星巴克 王府井」"
            value={addressQuery}
            onChange={(e) => {
              const val = e.target.value;
              onAddressQueryChange(val);
              setShowSuggestions(true);
              updateLocation((prev) => ({
                ...prev,
                address: val,
                // 手动改搜索词后，旧坐标可能已失效，需重新点选或解析
                latitude: prev.source === 'search' ? null : prev.latitude,
                longitude: prev.source === 'search' ? null : prev.longitude,
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
        value={value.name}
        onChange={(e) => {
          markManualEdit();
          updateLocation((prev) => ({ ...prev, enabled: true, name: e.target.value }));
        }}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="any"
          placeholder="纬度"
          value={value.latitude ?? ''}
          onChange={(e) => {
            markManualEdit();
            updateLocation((prev) => ({
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
          value={value.longitude ?? ''}
          onChange={(e) => {
            markManualEdit();
            updateLocation((prev) => ({
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
        {helperText}
      </p>
    </div>
  );
}
