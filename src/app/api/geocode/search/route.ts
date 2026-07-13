export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces, geocodeAddress } from '@/lib/geocode';

/** GET /api/geocode/search?q=关键词 — 地点搜索（输入提示） */
export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_AMAP_KEY) {
    return NextResponse.json(
      { success: false, error: '未配置 NEXT_PUBLIC_AMAP_KEY（请在 Vercel 环境变量中设置后重新部署）' },
      { status: 503 },
    );
  }

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

  return NextResponse.json({
    success: true,
    data: suggestions,
    // 海外节点调高德常失败；前端已改为浏览器端 JS API，此接口仅作兼容
    hint: suggestions.length === 0
      ? '无结果。若在 Vercel 上长期为空，请改用页面内地点搜索（浏览器端高德 JS API）'
      : undefined,
  });
}
