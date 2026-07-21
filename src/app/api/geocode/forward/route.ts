export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';

/** GET /api/geocode/forward?q=地址 — 正向地理编码（高德 → Nominatim） */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (!q) {
    return NextResponse.json({ success: false, error: '请输入地址' }, { status: 400 });
  }

  const result = await geocodeAddress(q);
  if (!result) {
    return NextResponse.json({ success: false, error: '无法解析该地址的坐标' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result });
}
