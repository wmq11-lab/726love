export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode } from '@/lib/geocode';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ success: false, error: '无效的经纬度' }, { status: 400 });
  }

  const result = await reverseGeocode(lat, lng);
  if (!result) {
    return NextResponse.json({
      success: false,
      error: '地址解析失败，请手动填写地点名称',
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      name: result.name,
      address: result.address,
      latitude: lat,
      longitude: lng,
      provider: result.provider,
    },
  });
}
