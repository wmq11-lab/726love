export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3ClientAndBucket } from '@/lib/storage';
import { logger } from '@/lib/logger';

const ALLOWED_PREFIX = 'love-records/';
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = 720;

/**
 * GET /api/img?key=love-records/xxx&w=720
 * 从对象存储取原图，按宽度缩放后返回（带长缓存）。
 * 列表用小图，避免浏览器直接拉数 MB 原图。
 */
export async function GET(request: NextRequest) {
  try {
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

    const obj = await ctx.client.send(
      new GetObjectCommand({ Bucket: ctx.bucketName, Key: key }),
    );
    if (!obj.Body) {
      return NextResponse.json({ success: false, error: '图片不存在' }, { status: 404 });
    }

    const input = Buffer.from(await obj.Body.transformToByteArray());
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
    logger.error('[GET /api/img]', err);
    return NextResponse.json({ success: false, error: '图片处理失败' }, { status: 500 });
  }
}
