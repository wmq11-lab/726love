const AMAP_FETCH_TIMEOUT_MS = 8000;

async function fetchAmapJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(AMAP_FETCH_TIMEOUT_MS) });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 高德逆地理编码：经纬度 → 地址 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ name: string; address: string } | null> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) return null;

  const location = `${longitude},${latitude}`;
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${location}&extensions=base`;

  const json = await fetchAmapJson(url);
  if (!json || json.status !== '1' || !json.regeocode) return null;

  const regeo = json.regeocode as {
    formatted_address?: string;
    pois?: Array<{ name: string }>;
    addressComponent?: { township?: string; district?: string; city?: string };
  };
  const address = regeo.formatted_address || '';
  const poiName = regeo.pois?.[0]?.name;
  const component = regeo.addressComponent;
  const district = [component?.township, component?.district, component?.city]
    .filter(Boolean)
    .join('');

  return {
    name: poiName || district || address.slice(0, 20) || '照片拍摄地',
    address,
  };
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

  const json = await fetchAmapJson(url);
  if (!json || json.status !== '1' || !Array.isArray(json.tips)) return [];

  const results: PlaceSuggestion[] = [];
  for (const tip of json.tips as Array<{
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
export async function geocodeAddress(
  address: string,
): Promise<{ name: string; address: string; latitude: number; longitude: number } | null> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key || !address.trim()) return null;

  const url = `https://restapi.amap.com/v3/geocode/geo?key=${key}&address=${encodeURIComponent(address.trim())}`;

  const json = await fetchAmapJson(url);
  if (!json || json.status !== '1' || !Array.isArray(json.geocodes) || !json.geocodes[0]) return null;

  const geo = json.geocodes[0] as { location?: string; formatted_address?: string };
  const coords = geo.location ? parseLocation(geo.location) : null;
  if (!coords) return null;

  const formatted = geo.formatted_address || address.trim();
  return {
    name: formatted.slice(0, 20),
    address: formatted,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

