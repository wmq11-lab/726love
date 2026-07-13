export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3ClientAndBucket, generateImageUrl } from '@/lib/storage';
import { logger } from '@/lib/logger';

const ALLOWED_PREFIX = 'love-records/';
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = 720;

async function redirectToSigned(key: string) {
  const url = await generateImageUrl(key, 86400);
  if (!url) {
    return NextResponse.json({ success: false, error: '生成图片链接失败' }, { status: 500 });
  }
  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}

/**
 * GET /api/img?key=love-records/xxx&w=720
 * 优先用 sharp 缩放；在 Vercel 上 sharp 原生库缺失时回退到签名原图，避免整页 500。
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')?.trim() || '';
  const widthRaw = parseInt(request.nextUrl.searchParams.get('w') || '', 10);
  const width = Number.isFinite(widthRaw)
    ? Math.min(Math.max(widthRaw, 64), MAX_WIDTH)
    : DEFAULT_WIDTH;

  if (!key || key.startsWith('data:') || key.includes('..') || !key.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json({ success: false, error: '无效的图片 key' }, { status: 400 });
  }

  const ctx = getS3ClientAndBucket();
  if (!ctx) {
    return NextResponse.json({ success: false, error: '对象存储未配置' }, { status: 503 });
  }

  let sharpMod: typeof import('sharp') | null = null;
  try {
    sharpMod = await import('sharp');
  } catch (err) {
    logger.error('[GET /api/img] sharp unavailable, fallback to signed URL', err);
    return redirectToSigned(key);
  }

  try {
    const obj = await ctx.client.send(
      new GetObjectCommand({ Bucket: ctx.bucketName, Key: key }),
    );
    if (!obj.Body) {
      return NextResponse.json({ success: false, error: '图片不存在' }, { status: 404 });
    }

    const input = Buffer.from(await obj.Body.transformToByteArray());
    const sharp = sharpMod.default;
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Content-Length': String(output.length),
      },
    });
  } catch (err) {
    logger.error('[GET /api/img] resize failed, fallback to signed URL', err);
    return redirectToSigned(key);
  }
}
