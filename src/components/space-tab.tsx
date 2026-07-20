'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { loadAmapScript, getAmapKey, getAmapSecurityCode, isAmapCompatMode } from '@/lib/amap';
import { buildFootprintRoute } from '@/lib/footprint-route';

interface MarkerImage {
  id: string;
  url: string;
}

interface MarkerRecord {
  id: string;
  title: string;
  content: string;
  record_date: string;
  mood_tag: string;
  images: MarkerImage[];
}

interface SpaceMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  records: MarkerRecord[];
  coverImage: string | null;
  imageCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AMapType = any;

export function SpaceTab() {
  const [markers, setMarkers] = useState<SpaceMarker[]>([]);
  const [markersLoading, setMarkersLoading] = useState(true);
  const [selected, setSelected] = useState<SpaceMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [amapKey, setAmapKey] = useState(getAmapKey());
  const [showRoute, setShowRoute] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<AMapType>(null);
  const markerInstancesRef = useRef<AMapType[]>([]);
  const polylineRef = useRef<AMapType>(null);
  const routeMarkerInstancesRef = useRef<AMapType[]>([]);

  const { waypoints, path: routePath } = useMemo(
    () => buildFootprintRoute(markers),
    [markers],
  );

  const fetchMarkers = useCallback(async () => {
    setMarkersLoading(true);
    try {
      const res = await fetch('/api/space/markers');
      const json = await res.json();
      if (json.success) setMarkers(json.data);
    } catch {
      // ignore
    } finally {
      setMarkersLoading(false);
    }
  }, []);

  useEffect(() => { fetchMarkers(); }, [fetchMarkers]);

  const initMapScript = useCallback(async (key: string) => {
    if (!key) return;
    setMapError('');
    try {
      await loadAmapScript(key, getAmapSecurityCode());
      setAmapKey(key);
      setMapReady(true);
    } catch (err) {
      setMapReady(false);
      setMapError((err as Error).message || '高德地图加载失败');
    }
  }, []);

  useEffect(() => {
    if (amapKey) initMapScript(amapKey);
  }, [amapKey, initMapScript]);

  const buildMarkerContent = (marker: SpaceMarker) => {
    const count = marker.imageCount;
    const imgHtml = marker.coverImage
      ? `<img src="${marker.coverImage}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#FFF8F0;font-size:20px;">📍</div>`;

    return `<div style="position:relative;width:52px;height:52px;">
      <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:3px solid #C4956A;box-shadow:0 2px 8px rgba(196,149,106,0.4);background:#fff;">
        ${imgHtml}
      </div>
      ${count > 0 ? `<div style="position:absolute;bottom:0;right:0;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#C4956A;color:#fff;font-size:10px;line-height:18px;text-align:center;font-weight:600;">${count}</div>` : ''}
    </div>`;
  };

  // 初始化地图（仅一次）
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AMap = (window as any).AMap;
    if (!AMap) return;

    try {
      const map = new AMap.Map(mapRef.current, {
        zoom: 11,
        center: [116.397428, 39.90923],
        resizeEnable: true,
        ...(getAmapSecurityCode() ? { mapStyle: 'amap://styles/normal' } : {}),
      });
      mapInstanceRef.current = map;

      map.on('complete', () => {
        map.resize();
      });

      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 300);
      setTimeout(() => map.resize(), 1000);
    } catch (err) {
      setMapError('地图初始化失败: ' + (err as Error).message);
    }

    return () => {
      markerInstancesRef.current = [];
      routeMarkerInstancesRef.current = [];
      polylineRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady]);

  const clearRouteOverlays = useCallback((map: AMapType) => {
    if (polylineRef.current) {
      map.remove(polylineRef.current);
      polylineRef.current = null;
    }
    routeMarkerInstancesRef.current.forEach((m) => map.remove(m));
    routeMarkerInstancesRef.current = [];
  }, []);

  // 更新标记点
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AMap = (window as any).AMap;
    if (!AMap) return;

    const map = mapInstanceRef.current;
    markerInstancesRef.current.forEach((m) => map.remove(m));
    markerInstancesRef.current = [];

    markers.forEach((marker) => {
      const instance = new AMap.Marker({
        position: [marker.longitude, marker.latitude],
        content: buildMarkerContent(marker),
        offset: new AMap.Pixel(-26, -52),
        title: marker.name,
      });
      instance.on('click', () => {
        setSelected(marker);
        map.setZoomAndCenter(15, [marker.longitude, marker.latitude]);
      });
      map.add(instance);
      markerInstancesRef.current.push(instance);
    });

    if (markers.length === 1) {
      map.setZoomAndCenter(14, [markers[0].longitude, markers[0].latitude]);
    } else if (markers.length > 1) {
      map.setFitView(markerInstancesRef.current, false, [60, 60, 60, 60]);
    }

    map.resize();
  }, [mapReady, markers]);

  // 足迹连线
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AMap = (window as any).AMap;
    if (!AMap) return;

    const map = mapInstanceRef.current;
    clearRouteOverlays(map);

    if (!showRoute || routePath.length < 2) return;

    const polyline = new AMap.Polyline({
      path: routePath,
      strokeColor: '#C4956A',
      strokeWeight: 4,
      strokeOpacity: 0.75,
      strokeStyle: 'dashed',
      lineJoin: 'round',
      lineCap: 'round',
      ...(isAmapCompatMode() ? {} : { showDir: true, dirColor: '#F2C9C9' }),
    });
    map.add(polyline);
    polylineRef.current = polyline;

    waypoints.forEach((wp) => {
      const label = new AMap.Marker({
        position: [wp.longitude, wp.latitude],
        content: `<div style="width:20px;height:20px;border-radius:50%;background:#C4956A;color:#fff;font-size:10px;font-weight:700;line-height:20px;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(74,55,40,0.25);">${wp.order}</div>`,
        offset: new AMap.Pixel(-10, -10),
        zIndex: 120,
      });
      map.add(label);
      routeMarkerInstancesRef.current.push(label);
    });
  }, [mapReady, showRoute, routePath, waypoints, clearRouteOverlays]);

  // Tab 可见时重绘（解决切换 Tab 后地图空白）
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          mapInstanceRef.current?.resize();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  // 窗口尺寸变化时重绘地图
  useEffect(() => {
    if (!mapReady) return;
    const onResize = () => mapInstanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mapReady]);

  const handleLocate = (marker: SpaceMarker) => {
    setSelected(marker);
    mapInstanceRef.current?.setZoomAndCenter(15, [marker.longitude, marker.latitude]);
  };

  const allImages = selected ? selected.records.flatMap((r) => r.images) : [];

  return (
    <div className="space-map-root relative w-full h-full">
      {/* 地图容器 */}
      <div ref={mapRef} className="space-map-container absolute inset-0 w-full h-full" />

      {/* 地图加载中 */}
      {amapKey && !mapReady && !mapError && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(254,250,245,0.85)' }}
        >
          <p className="text-sm" style={{ color: '#A0846C' }}>地图加载中...</p>
        </div>
      )}

      {/* 未配置 Key */}
      {!amapKey && !mapReady && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(254,250,245,0.95)' }}
        >
          <div className="rounded-2xl p-5 max-w-md w-full space-y-3" style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}>
            <p className="text-sm text-center" style={{ color: '#4A3728' }}>请配置高德地图 Key 以展示空间地图</p>
            <p className="text-xs text-center" style={{ color: '#A0846C' }}>
              在 .env 中设置 NEXT_PUBLIC_AMAP_KEY，并重启开发服务器
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="输入高德 Key..."
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4', color: '#4A3728' }}
              />
              <button
                onClick={() => initMapScript(keyInput)}
                disabled={!keyInput}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C4956A', color: '#FFFFFF' }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {mapReady && isAmapCompatMode() && (
        <div
          className="absolute top-32 left-4 right-4 z-10 px-3 py-2 rounded-xl text-[10px] pointer-events-auto"
          style={{ backgroundColor: 'rgba(255,248,240,0.95)', border: '1px solid #F2C9C9', color: '#A0846C' }}
        >
          未配置安全密钥，已使用地图兼容模式（v1.4 栅格瓦片）。
          在 .env 添加 <code style={{ color: '#C4956A' }}>NEXT_PUBLIC_AMAP_SECURITY_CODE</code> 后可启用 2.0 矢量地图。
          若仍空白请 <strong>硬刷新页面</strong>（Cmd+Shift+R）。
        </div>
      )}

      {mapError && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-3 rounded-xl text-xs max-w-md text-center"
          style={{ backgroundColor: '#FFF8F0', color: '#A0846C', border: '1px solid #F2C9C9' }}
        >
          <p>{mapError}</p>
          <p className="mt-1 opacity-80">
            请确认 Key 类型为「Web端(JS API)」，并在高德控制台将 <strong>localhost</strong>、<strong>127.0.0.1</strong>、<strong>726love.vercel.app</strong> 加入域名白名单；
            若使用 2.0 安全密钥，请在 .env 添加 NEXT_PUBLIC_AMAP_SECURITY_CODE
          </p>
        </div>
      )}

      {/* 左上角统计 + 足迹连线开关 */}
      <div className="absolute top-20 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <div
          className="px-3 py-2 rounded-xl text-xs shadow-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid #E8D5C4', color: '#4A3728' }}
        >
          {markersLoading ? (
            <span style={{ color: '#A0846C' }}>加载地点...</span>
          ) : (
            <>
              📍 <strong style={{ color: '#C4956A' }}>{markers.length}</strong> 个记忆地点
              {markers.reduce((s, m) => s + m.imageCount, 0) > 0 && (
                <span style={{ color: '#A0846C' }}> · {markers.reduce((s, m) => s + m.imageCount, 0)} 张照片</span>
              )}
              {waypoints.length >= 2 && (
                <span style={{ color: '#A0846C' }}> · 足迹 {waypoints.length} 站</span>
              )}
            </>
          )}
        </div>
        {waypoints.length >= 2 && (
          <button
            type="button"
            onClick={() => setShowRoute((v) => !v)}
            className="px-3 py-1.5 rounded-xl text-xs shadow-sm self-start"
            style={{
              backgroundColor: showRoute ? '#C4956A' : 'rgba(255,255,255,0.92)',
              color: showRoute ? '#FFFFFF' : '#4A3728',
              border: `1px solid ${showRoute ? '#C4956A' : '#E8D5C4'}`,
            }}
          >
            {showRoute ? '🛤 隐藏足迹连线' : '🛤 显示足迹连线'}
          </button>
        )}
      </div>

      {mapReady && !markersLoading && markers.length === 0 && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 px-4 py-3 rounded-2xl text-sm text-center max-w-xs"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid #E8D5C4', color: '#A0846C' }}
        >
          上传带 GPS 信息的照片，地点会自动标记在地图上 💕
        </div>
      )}

      {markers.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-4 pt-2 pointer-events-auto"
          style={{ background: 'linear-gradient(transparent, rgba(254,250,245,0.9) 30%)' }}
        >
          {showRoute && waypoints.length >= 2 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
              {waypoints.map((wp, idx) => (
                <div key={`${wp.locationId}-${wp.order}`} className="flex items-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const marker = markers.find((m) => m.id === wp.locationId);
                      if (marker) handleLocate(marker);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                    style={{
                      backgroundColor: selected?.id === wp.locationId ? '#C4956A' : 'rgba(255,255,255,0.95)',
                      color: selected?.id === wp.locationId ? '#FFFFFF' : '#4A3728',
                      border: `1px solid ${selected?.id === wp.locationId ? '#C4956A' : '#E8D5C4'}`,
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        backgroundColor: selected?.id === wp.locationId ? 'rgba(255,255,255,0.25)' : '#C4956A',
                        color: '#FFFFFF',
                      }}
                    >
                      {wp.order}
                    </span>
                    <span className="max-w-[88px] truncate">{wp.name}</span>
                    <span className="opacity-70 whitespace-nowrap">
                      {new Date(wp.recordDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </button>
                  {idx < waypoints.length - 1 && (
                    <span className="mx-1 text-xs" style={{ color: '#C4956A' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {markers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleLocate(m)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                  style={{
                    backgroundColor: selected?.id === m.id ? '#C4956A' : 'rgba(255,255,255,0.95)',
                    color: selected?.id === m.id ? '#FFFFFF' : '#4A3728',
                    border: `1px solid ${selected?.id === m.id ? '#C4956A' : '#E8D5C4'}`,
                  }}
                >
                  {m.coverImage ? (
                    <img src={m.coverImage} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>📍</span>
                  )}
                  <span className="max-w-[100px] truncate">{m.name}</span>
                  <span className="opacity-70">{m.imageCount}张</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div
          className="absolute top-20 right-4 z-20 w-80 max-h-[calc(100vh-100px)] overflow-hidden rounded-2xl shadow-lg flex flex-col animate-fade-in pointer-events-auto"
          style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #F2C9C9' }}
        >
          <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid #F0E3D5' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium truncate" style={{ color: '#4A3728' }}>{selected.name}</h4>
                {selected.address && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: '#A0846C' }}>{selected.address}</p>
                )}
                <p className="text-[10px] mt-1" style={{ color: '#A0846C' }}>
                  {selected.imageCount} 张照片 · {selected.records.length} 条记忆
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                style={{ backgroundColor: '#FFF8F0', color: '#A0846C' }}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {allImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {allImages.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square rounded-lg overflow-hidden"
                    style={{ border: '1px solid #E8D5C4' }}
                  >
                    <img src={img.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-4" style={{ color: '#A0846C' }}>该地点暂无照片</p>
            )}

            {selected.records.map((rec) => (
              <div key={rec.id} className="rounded-xl p-3" style={{ backgroundColor: '#FFFBF6', border: '1px solid #F0E3D5' }}>
                <p className="text-[10px] mb-1" style={{ color: '#A0846C' }}>
                  {new Date(rec.record_date).toLocaleDateString('zh-CN')} · {rec.mood_tag}
                </p>
                {rec.content?.trim() ? (
                  <p className="text-xs leading-relaxed line-clamp-3" style={{ color: '#4A3728', fontFamily: "'Noto Serif SC', serif" }}>
                    {rec.content}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
