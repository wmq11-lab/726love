import { isLikelyInChina, isUsefulPlaceResult } from '@/lib/geo-bounds';

const FETCH_TIMEOUT_MS = 10_000;

export interface ReverseGeocodeResult {
  name: string;
  address: string;
  provider?: 'amap' | 'bigdatacloud' | 'nominatim';
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 高德 REST 逆地理（国内优先） */
async function reverseGeocodeAmap(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) return null;

  const location = `${longitude},${latitude}`;
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${location}&extensions=base`;
  const json = await fetchJson(url);
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const data = json as Record<string, unknown>;
  if (data.status !== '1' || !data.regeocode) return null;

  const regeo = data.regeocode as {
    formatted_address?: string;
    pois?: Array<{ name: string }>;
    addressComponent?: { township?: string; district?: string; city?: string | string[] };
  };
  const address = (regeo.formatted_address || '').trim();
  // 高德对海外常返回空数组或空字符串
  if (!address || address === '[]') return null;

  const poiName = regeo.pois?.[0]?.name;
  const component = regeo.addressComponent;
  const city = Array.isArray(component?.city) ? component?.city[0] : component?.city;
  const district = [component?.township, component?.district, city].filter(Boolean).join('');

  const name = (poiName || district || address.slice(0, 40)).trim();
  if (!isUsefulPlaceResult({ name, address })) return null;

  return { name, address, provider: 'amap' };
}

/** BigDataCloud（免费、无需 Key，覆盖全球） */
async function reverseGeocodeBigDataCloud(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client`
    + `?latitude=${encodeURIComponent(String(latitude))}`
    + `&longitude=${encodeURIComponent(String(longitude))}`
    + `&localityLanguage=zh`;

  const json = await fetchJson(url);
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const data = json as Record<string, unknown>;

  const locality = String(data.locality || '').trim();
  const city = String(data.city || '').trim();
  const subdivision = String(data.principalSubdivision || '').trim();
  const country = String(data.countryName || '').trim();
  const plusCode = String(data.plusCode || '').trim();

  const name = locality || city || subdivision || country;
  if (!name) return null;

  const address = [locality, city, subdivision, country].filter(Boolean).join(', ')
    || plusCode
    || name;

  return { name: name.slice(0, 40), address, provider: 'bigdatacloud' };
}

/** OpenStreetMap Nominatim（全球兜底） */
async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse`
    + `?lat=${encodeURIComponent(String(latitude))}`
    + `&lon=${encodeURIComponent(String(longitude))}`
    + `&format=json&accept-language=zh-CN,en&addressdetails=1`;

  const json = await fetchJson(url, {
    headers: {
      // Nominatim 要求可识别的 User-Agent
      'User-Agent': '726love-diary/1.0 (https://github.com/wmq11-lab/726love)',
      Accept: 'application/json',
    },
  });
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const data = json as Record<string, unknown>;

  const display = String(data.display_name || '').trim();
  const named = String(data.name || '').trim();
  const addr = (data.address || {}) as Record<string, string>;

  const place =
    named
    || addr.tourism
    || addr.amenity
    || addr.attraction
    || addr.building
    || addr.road
    || addr.neighbourhood
    || addr.suburb
    || addr.village
    || addr.town
    || addr.city
    || addr.state
    || addr.country
    || '';

  if (!place && !display) return null;

  return {
    name: (place || display.slice(0, 40)).slice(0, 40),
    address: display || place,
    provider: 'nominatim',
  };
}

async function reverseGeocodeGlobal(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const bdc = await reverseGeocodeBigDataCloud(latitude, longitude);
  if (bdc && isUsefulPlaceResult(bdc)) return bdc;

  const osm = await reverseGeocodeNominatim(latitude, longitude);
  if (osm && isUsefulPlaceResult(osm)) return osm;

  return null;
}

/**
 * 逆地理编码：国内优先高德，失败或海外坐标则用全球服务兜底。
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const inChina = isLikelyInChina(latitude, longitude);

  if (inChina) {
    const amap = await reverseGeocodeAmap(latitude, longitude);
    if (amap) return amap;
  }

  const global = await reverseGeocodeGlobal(latitude, longitude);
  if (global) return global;

  // 海外偶发高德也能返回时再试一次
  if (!inChina) {
    const amap = await reverseGeocodeAmap(latitude, longitude);
    if (amap) return amap;
  }

  return null;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
}

function parseLocation(loc: string): { latitude: number; longitude: number } | null {
  const [lng, lat] = loc.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

/** 高德地点搜索（输入提示）— 服务端调用；Vercel 海外节点可能无法访问高德 */
export async function searchPlaces(keyword: string): Promise<PlaceSuggestion[]> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key || !keyword.trim()) return [];

  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${key}&keywords=${encodeURIComponent(keyword.trim())}&datatype=all`;
  const json = await fetchJson(url);
  if (!json || typeof json !== 'object' || Array.isArray(json)) return [];
  const data = json as Record<string, unknown>;
  if (data.status !== '1' || !Array.isArray(data.tips)) return [];

  const results: PlaceSuggestion[] = [];
  for (const tip of data.tips as Array<{
    id?: string;
    name?: string;
    address?: string;
    district?: string;
    location?: string;
  }>) {
    if (!tip.name || tip.name === '[]') continue;
    const coords = tip.location ? parseLocation(tip.location) : null;
    results.push({
      id: tip.id || `${tip.name}_${results.length}`,
      name: tip.name,
      address: tip.address || '',
      district: tip.district || '',
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });
  }
  return results.slice(0, 8);
}

/** 高德地理编码：地址 → 坐标 */
export async function geocodeAddressAmap(
  address: string,
): Promise<{ name: string; address: string; latitude: number; longitude: number } | null> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key || !address.trim()) return null;

  const url = `https://restapi.amap.com/v3/geocode/geo?key=${key}&address=${encodeURIComponent(address.trim())}`;
  const json = await fetchJson(url);
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const data = json as Record<string, unknown>;
  if (data.status !== '1' || !Array.isArray(data.geocodes) || !data.geocodes[0]) return null;

  const geo = data.geocodes[0] as { location?: string; formatted_address?: string };
  const coords = geo.location ? parseLocation(geo.location) : null;
  if (!coords) return null;

  const formatted = geo.formatted_address || address.trim();
  return {
    name: formatted.slice(0, 40),
    address: formatted,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

/** Nominatim 正向地理编码（海外 / 高德失败时兜底） */
async function geocodeAddressNominatim(
  address: string,
): Promise<{ name: string; address: string; latitude: number; longitude: number } | null> {
  const q = address.trim();
  if (!q) return null;

  const url =
    `https://nominatim.openstreetmap.org/search`
    + `?q=${encodeURIComponent(q)}`
    + `&format=json&limit=1&accept-language=zh-CN,en`;

  const json = await fetchJson(url, {
    headers: {
      'User-Agent': '726love-diary/1.0 (https://github.com/wmq11-lab/726love)',
      Accept: 'application/json',
    },
  });
  if (!Array.isArray(json) || !json[0]) return null;

  const hit = json[0] as { lat?: string; lon?: string; display_name?: string; name?: string };
  const latitude = parseFloat(hit.lat || '');
  const longitude = parseFloat(hit.lon || '');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const formatted = (hit.display_name || hit.name || q).trim();
  return {
    name: (hit.name || formatted.slice(0, 40)).slice(0, 40),
    address: formatted,
    latitude,
    longitude,
  };
}

/** 地理编码：高德优先，失败则 Nominatim 全球兜底 */
export async function geocodeAddress(
  address: string,
): Promise<{ name: string; address: string; latitude: number; longitude: number } | null> {
  const amap = await geocodeAddressAmap(address);
  if (amap) return amap;
  return geocodeAddressNominatim(address);
}
