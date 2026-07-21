export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces, geocodeAddress } from '@/lib/geocode';

function hasCoords(item: { latitude?: number | null; longitude?: number | null }) {
  return (
    typeof item.latitude === 'number'
    && typeof item.longitude === 'number'
    && Number.isFinite(item.latitude)
    && Number.isFinite(item.longitude)
  );
}

/** GET /api/geocode/search?q=关键词 — 地点搜索（输入提示） */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';

  if (!q) {
    return NextResponse.json({ success: false, error: '请输入搜索关键词' }, { status: 400 });
  }

  let suggestions = process.env.NEXT_PUBLIC_AMAP_KEY ? await searchPlaces(q) : [];

  // 优先返回带坐标的建议；若全无坐标，用正向地理编码补一条
  const withCoords = suggestions.filter(hasCoords);
  if (withCoords.length > 0) {
    return NextResponse.json({ success: true, data: withCoords });
  }

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

  return NextResponse.json({
    success: true,
    data: suggestions,
    hint: suggestions.length === 0
      ? '无结果，请尝试更具体的地名或手动填写经纬度'
      : '推荐项暂无坐标，请点选后等待解析，或手动填写经纬度',
  });
}
