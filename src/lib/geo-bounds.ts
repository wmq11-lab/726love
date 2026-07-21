/** 粗略判断是否在中国境内（含台港澳周边），用于优先走高德 */

export function isLikelyInChina(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  // 大致覆盖：大陆、海南、台湾、南海部分岛屿
  return latitude >= 15 && latitude <= 54 && longitude >= 73 && longitude <= 135;
}

export function isUsefulPlaceResult(place: { name?: string; address?: string } | null): boolean {
  if (!place) return false;
  const name = (place.name || '').trim();
  const address = (place.address || '').trim();
  if (!name && !address) return false;
  if (name === '照片拍摄地' && !address) return false;
  return true;
}
