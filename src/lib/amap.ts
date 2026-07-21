const AMAP_SCRIPT_ID = 'amap-js-sdk';
const AMAP_PLUGIN_TIMEOUT_MS = 12_000;

function isAmapReady(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && !!(window as any).AMap;
}

/** 无安全密钥时用 1.4 栅格瓦片，兼容性更好；有安全密钥时用 2.0 矢量瓦片 */
export function getAmapVersion(): string {
  return getAmapSecurityCode() ? '2.0' : '1.4.15';
}

/** 注入高德安全密钥（2.0 Key 必须） */
export function setAmapSecurityConfig(securityJsCode: string) {
  if (typeof window === 'undefined' || !securityJsCode) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._AMapSecurityConfig = { securityJsCode };
}

function clearAmapGlobal() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).AMap;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any)._AMapSecurityConfig;
}

/** 动态加载高德地图 JS API */
export function loadAmapScript(key: string, securityJsCode?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('仅可在浏览器加载地图'));
      return;
    }

    const version = securityJsCode ? '2.0' : '1.4.15';
    if (securityJsCode) setAmapSecurityConfig(securityJsCode);

    const expectedSrc = `https://webapi.amap.com/maps?v=${version}&key=${key}`;
    const existing = document.getElementById(AMAP_SCRIPT_ID) as HTMLScriptElement | null;

    // 版本不匹配时（例如之前加载了 2.0 但没配安全密钥），强制重载
    if (existing && existing.src !== expectedSrc) {
      existing.remove();
      clearAmapGlobal();
    }

    if (isAmapReady()) {
      resolve();
      return;
    }

    if (existing) {
      const onLoad = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('高德地图加载失败')); };
      const cleanup = () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
        clearInterval(poll);
        clearTimeout(timeout);
      };
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
      const poll = setInterval(() => {
        if (isAmapReady()) { cleanup(); resolve(); }
      }, 100);
      const timeout = setTimeout(() => {
        cleanup();
        if (isAmapReady()) resolve();
        else reject(new Error('高德地图加载超时，请检查 Key 与安全密钥配置'));
      }, 15000);
      return;
    }

    const script = document.createElement('script');
    script.id = AMAP_SCRIPT_ID;
    script.src = expectedSrc;
    script.async = true;
    script.onerror = () => reject(new Error('高德地图加载失败，请检查 Key 与域名白名单'));
    script.onload = () => {
      const poll = setInterval(() => {
        if (isAmapReady()) {
          cleanup();
          resolve();
        }
      }, 50);
      const timeout = setTimeout(() => {
        cleanup();
        if (isAmapReady()) resolve();
        else reject(new Error('高德地图加载超时，请检查 Key、安全密钥与域名白名单'));
      }, 15000);
      const cleanup = () => {
        clearInterval(poll);
        clearTimeout(timeout);
      };
    };
    document.head.appendChild(script);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export function getAmapKey(): string {
  return process.env.NEXT_PUBLIC_AMAP_KEY || '';
}

export function getAmapSecurityCode(): string {
  return process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '';
}

export function isAmapCompatMode(): boolean {
  return !getAmapSecurityCode();
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  district: string;
  /** inputtips 常无坐标，选中后再地理编码 */
  latitude: number | null;
  longitude: number | null;
}

function parseLocation(loc: string): { latitude: number; longitude: number } | null {
  const [lng, lat] = loc.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function tipAddress(address: unknown): string {
  if (typeof address === 'string' && address !== '[]') return address;
  if (Array.isArray(address)) return address.filter(Boolean).join('');
  return '';
}

/** 确保浏览器已加载高德 JS API（供地点搜索 / 逆地理使用） */
async function ensureAmap(): Promise<AmapNamespace> {
  const key = getAmapKey();
  if (!key) throw new Error('未配置 NEXT_PUBLIC_AMAP_KEY');
  await loadAmapScript(key, getAmapSecurityCode() || undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).AMap as AmapNamespace;
}

interface AmapNamespace {
  plugin: (name: string | string[], cb: () => void) => void;
  AutoComplete: new (opts: { city?: string }) => {
    search: (keyword: string, cb: (status: string, result: { tips?: AmapTip[] }) => void) => void;
  };
  Geocoder: new (opts?: { city?: string }) => {
    getAddress: (
      lnglat: [number, number],
      cb: (status: string, result: { regeocode?: AmapRegeo }) => void,
    ) => void;
    getLocation: (
      address: string,
      cb: (status: string, result: { geocodes?: AmapGeocode[] }) => void,
    ) => void;
  };
}

interface AmapTip {
  id?: string;
  name?: string;
  district?: string;
  address?: string | string[];
  location?: string | { lng: number; lat: number };
}

interface AmapRegeo {
  formattedAddress?: string;
  addressComponent?: {
    township?: string;
    district?: string;
    city?: string | string[];
  };
  pois?: Array<{ name?: string }>;
}

interface AmapGeocode {
  formattedAddress?: string;
  location?: { lng: number; lat: number };
}

function tipCoords(location: AmapTip['location']): { latitude: number; longitude: number } | null {
  if (!location) return null;
  if (typeof location === 'string') return parseLocation(location);
  if (typeof location === 'object' && Number.isFinite(location.lng) && Number.isFinite(location.lat)) {
    return { latitude: location.lat, longitude: location.lng };
  }
  return null;
}

/**
 * 浏览器端地点搜索（走高德 JS API）。
 * Vercel 等海外服务器无法稳定调用 restapi.amap.com，故搜索应在客户端完成。
 */
export async function searchPlacesClient(keyword: string): Promise<PlaceSuggestion[]> {
  const q = keyword.trim();
  if (!q) return [];

  const AMap = await ensureAmap();

  return withTimeout(
    new Promise<PlaceSuggestion[]>((resolve, reject) => {
    AMap.plugin('AMap.AutoComplete', () => {
      try {
        const auto = new AMap.AutoComplete({ city: '全国' });
        auto.search(q, (status, result) => {
          if (status !== 'complete' || !Array.isArray(result?.tips)) {
            resolve([]);
            return;
          }
          const results: PlaceSuggestion[] = [];
          for (const tip of result.tips) {
            if (!tip.name || tip.name === '[]') continue;
            const coords = tipCoords(tip.location);
            results.push({
              id: tip.id || `${tip.name}_${results.length}`,
              name: tip.name,
              address: tipAddress(tip.address),
              district: tip.district || '',
              latitude: coords?.latitude ?? null,
              longitude: coords?.longitude ?? null,
            });
          }
          resolve(results.slice(0, 8));
        });
      } catch (err) {
        reject(err);
      }
    });
    }),
    AMAP_PLUGIN_TIMEOUT_MS,
    '地点搜索超时，请检查高德 Key 或稍后重试',
  );
}

/** 浏览器端逆地理编码：经纬度 → 地址（国内优先高德 JS，失败/海外走服务端全球兜底） */
export async function reverseGeocodeClient(
  latitude: number,
  longitude: number,
): Promise<{ name: string; address: string } | null> {
  const { isLikelyInChina, isUsefulPlaceResult } = await import('@/lib/geo-bounds');

  if (isLikelyInChina(latitude, longitude)) {
    try {
      const AMap = await ensureAmap();
      const amapResult = await withTimeout(
        new Promise<{ name: string; address: string } | null>((resolve, reject) => {
          AMap.plugin('AMap.Geocoder', () => {
            try {
              const geocoder = new AMap.Geocoder();
              geocoder.getAddress([longitude, latitude], (status, result) => {
                if (status !== 'complete' || !result?.regeocode) {
                  resolve(null);
                  return;
                }
                const regeo = result.regeocode;
                const address = (regeo.formattedAddress || '').trim();
                if (!address || address === '[]') {
                  resolve(null);
                  return;
                }
                const poiName = regeo.pois?.[0]?.name;
                const component = regeo.addressComponent;
                const city = Array.isArray(component?.city) ? component?.city[0] : component?.city;
                const district = [component?.township, component?.district, city].filter(Boolean).join('');
                resolve({
                  name: (poiName || district || address.slice(0, 40)).trim(),
                  address,
                });
              });
            } catch (err) {
              reject(err);
            }
          });
        }),
        AMAP_PLUGIN_TIMEOUT_MS,
        '逆地理编码超时',
      );
      if (isUsefulPlaceResult(amapResult)) return amapResult;
    } catch {
      // 继续走服务端兜底
    }
  }

  try {
    const res = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    const json = (await res.json()) as {
      success?: boolean;
      data?: { name?: string; address?: string };
    };
    if (json.success && isUsefulPlaceResult(json.data || null)) {
      return {
        name: (json.data!.name || '').trim(),
        address: (json.data!.address || '').trim(),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/** 浏览器端地理编码：地址 → 坐标 */
export async function geocodeAddressClient(
  address: string,
): Promise<{ name: string; address: string; latitude: number; longitude: number } | null> {
  const q = address.trim();
  if (!q) return null;

  const AMap = await ensureAmap();

  return withTimeout(
    new Promise<{ name: string; address: string; latitude: number; longitude: number } | null>(
      (resolve, reject) => {
        AMap.plugin('AMap.Geocoder', () => {
          try {
            const geocoder = new AMap.Geocoder();
            geocoder.getLocation(q, (status, result) => {
              const geo = result?.geocodes?.[0];
              if (status !== 'complete' || !geo?.location) {
                resolve(null);
                return;
              }
              const formatted = geo.formattedAddress || q;
              resolve({
                name: formatted.slice(0, 20),
                address: formatted,
                latitude: geo.location.lat,
                longitude: geo.location.lng,
              });
            });
          } catch (err) {
            reject(err);
          }
        });
      },
    ),
    AMAP_PLUGIN_TIMEOUT_MS,
    '地理编码超时',
  );
}

/** 发布记忆时解析地址：客户端高德 → 服务端 API，避免无限等待 */
export async function resolvePlaceForSave(
  address: string,
): Promise<PlaceSuggestion | null> {
  const q = address.trim();
  if (!q) return null;

  try {
    const fromAuto = (await searchPlacesClient(q))[0];
    if (fromAuto) return fromAuto;
  } catch {
    // 继续降级
  }

  try {
    const geo = await geocodeAddressClient(q);
    if (geo) {
      return {
        id: `geo_${geo.latitude}_${geo.longitude}`,
        name: geo.name,
        address: geo.address,
        district: '',
        latitude: geo.latitude,
        longitude: geo.longitude,
      };
    }
  } catch {
    // 继续降级
  }

  try {
    const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(12_000),
    });
    const json = (await res.json()) as { success?: boolean; data?: PlaceSuggestion[] };
    if (json.success && json.data?.[0]) return json.data[0];
  } catch {
    // ignore
  }

  return null;
}
