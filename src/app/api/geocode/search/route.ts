import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces, geocodeAddress } from '@/lib/geocode';

/** GET /api/geocode/search?q=关键词 — 地点搜索（输入提示） */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';

  if (!q) {
    return NextResponse.json({ success: false, error: '请输入搜索关键词' }, { status: 400 });
  }

  const suggestions = await searchPlaces(q);

  // 输入提示无结果时，尝试地理编码
  if (suggestions.length === 0) {
    const geo = await geocodeAddress(q);
    if (geo) {
      return NextResponse.json({
        success: true,
        data: [{
          id: `geo_${geo.latitude}_${geo.longitude}`,
          name: geo.name,
          address: geo.address,
          district: '',
          latitude: geo.latitude,
          longitude: geo.longitude,
        }],
      });
    }
  }

  return NextResponse.json({ success: true, data: suggestions });
}
