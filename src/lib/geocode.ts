/** 高德逆地理编码：经纬度 → 地址 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ name: string; address: string } | null> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) return null;

  const location = `${longitude},${latitude}`;
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${location}&extensions=base`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== '1' || !json.regeocode) return null;

    const regeo = json.regeocode;
    const address = regeo.formatted_address || '';
    const pois = regeo.pois as Array<{ name: string }> | undefined;
    const poiName = pois?.[0]?.name;
    const component = regeo.addressComponent;
    const district = [component?.township, component?.district, component?.city]
      .filter(Boolean)
      .join('');

    return {
      name: poiName || district || address.slice(0, 20) || '照片拍摄地',
      address,
    };
  } catch {
    return null;
  }
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
}

function parseLocation(loc: string): { latitude: number; longitude: number } | null {
  const [lng, lat] = loc.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

/** 高德地点搜索（输入提示） */
export async function searchPlaces(keyword: string): Promise<PlaceSuggestion[]> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key || !keyword.trim()) return [];

  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${key}&keywords=${encodeURIComponent(keyword.trim())}&datatype=all`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== '1' || !Array.isArray(json.tips)) return [];

    const results: PlaceSuggestion[] = [];
    for (const tip of json.tips) {
      if (!tip.name || tip.name === '[]') continue;
      const coords = tip.location ? parseLocation(tip.location) : null;
      if (!coords) continue;
      results.push({
        id: tip.id || `${tip.name}_${coords.latitude}`,
        name: tip.name,
        address: tip.address || '',
        district: tip.district || '',
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
    return results.slice(0, 8);
  } catch {
    return [];
  }
}

/** 高德地理编码：地址 → 坐标 */
export async function geocodeAddress(
  address: string,
): Promise<{ name: string; address: string; latitude: number; longitude: number } | null> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key || !address.trim()) return null;

  const url = `https://restapi.amap.com/v3/geocode/geo?key=${key}&address=${encodeURIComponent(address.trim())}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== '1' || !json.geocodes?.[0]) return null;

    const geo = json.geocodes[0];
    const coords = parseLocation(geo.location);
    if (!coords) return null;

    const formatted = geo.formatted_address || address.trim();
    return {
      name: formatted.slice(0, 20),
      address: formatted,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  } catch {
    return null;
  }
}

