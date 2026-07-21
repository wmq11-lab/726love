export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStorage, generateImageUrl, isObjectStorageConfigured } from '@/lib/storage';
import {
  MAX_IMAGE_SIZE,
  MAX_IMAGE_SIZE_MB,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_SIZE_MB,
} from '@/lib/upload';
import { logger } from '@/lib/logger';

/** 无对象存储时，允许 base64 降级的最大体积（超过则必须配置 R2/S3） */
const MAX_BASE64_FALLBACK_SIZE = 200 * 1024;
const IMAGE_UPLOAD_TIMEOUT_MS = 15_000;
const VIDEO_UPLOAD_TIMEOUT_MS = 120_000;

/** 判断 storage_key 是否为 base64 data URL（不需要签名） */
function isDataUrl(key: string) {
  return key.startsWith('data:');
}

function isVideoContentType(type: string) {
  return type.startsWith('video/');
}

// GET /api/upload — 获取媒体签名URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ success: false, error: '缺少 key 参数' }, { status: 400 });
    }

    if (isDataUrl(key)) {
      return NextResponse.json({ success: true, url: key });
    }

    const url = await generateImageUrl(key, 86400);
    if (!url) {
      return NextResponse.json({ success: false, error: '生成媒体访问链接失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    logger.error('[GET /api/upload]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** 带超时的 S3 上传，失败或超时返回 null */
async function tryUploadToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  timeoutMs: number,
): Promise<string | null> {
  if (!isObjectStorageConfigured()) return null;

  try {
    const storage = await getStorage();
    const uploadPromise = storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    const result = await Promise.race([
      uploadPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('S3_TIMEOUT')), timeoutMs)),
    ]);
    return result;
  } catch {
    return null;
  }
}

function toDataUrl(buffer: Buffer, contentType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

function storageUnavailableError(fileSize: number, kind: 'image' | 'video'): string {
  const label = kind === 'video' ? '视频' : '图片';
  if (!isObjectStorageConfigured()) {
    return `${label}存储未配置。请在 .env 中填写 COZE_BUCKET_*（推荐 Cloudflare R2），当前文件 ${(fileSize / 1024 / 1024).toFixed(1)}MB 无法存入数据库。`;
  }
  return `${label}上传到对象存储失败，请检查 COZE_BUCKET_* 配置后重试。`;
}

// POST /api/upload — 上传图片或视频（S3 优先；仅小图可降级 base64）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const recordId = formData.get('record_id') as string | null;
    const caption = formData.get('caption') as string | null;
    const templateStyle = formData.get('template_style') as string | null;
    const sortOrderRaw = formData.get('sort_order') as string | null;
    const sortOrder = sortOrderRaw != null ? parseInt(sortOrderRaw, 10) : 0;

    if (!file) {
      return NextResponse.json({ success: false, error: '未提供文件' }, { status: 400 });
    }

    const isVideo = isVideoContentType(file.type);
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      return NextResponse.json({
        success: false,
        error: '仅支持图片或视频文件（mp4 / webm / mov）',
      }, { status: 400 });
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxMb = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），${isVideo ? '视频' : '图片'}最大支持 ${maxMb}MB`,
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = file.name.replace(/[^\w.\-()+]/g, '_');
    const prefix = isVideo ? 'love-records/videos' : 'love-records';
    const fileName = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

    let storageKey: string | null = await tryUploadToS3(
      buffer,
      fileName,
      file.type || (isVideo ? 'video/mp4' : 'application/octet-stream'),
      isVideo ? VIDEO_UPLOAD_TIMEOUT_MS : IMAGE_UPLOAD_TIMEOUT_MS,
    );
    let url: string | null = null;

    if (storageKey) {
      url = await generateImageUrl(storageKey, 86400 * 7);
    } else if (!isVideo && file.size <= MAX_BASE64_FALLBACK_SIZE) {
      url = toDataUrl(buffer, file.type);
      storageKey = url;
    } else {
      return NextResponse.json({
        success: false,
        error: storageUnavailableError(file.size, isVideo ? 'video' : 'image'),
      }, { status: 400 });
    }

    const style = isVideo ? 'video' : (templateStyle || 'polaroid');

    if (recordId) {
      const { getSupabaseClient } = await import('@/storage/database/supabase-client');
      const client = getSupabaseClient();

      const { error: dbError } = await client.from('record_images').insert({
        record_id: recordId,
        storage_key: storageKey,
        caption: caption || '',
        template_style: style,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      });

      if (dbError) throw new Error(`保存媒体记录失败: ${dbError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        storage_key: storageKey,
        url: url || storageKey,
        media_type: isVideo ? 'video' : 'image',
        template_style: style,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[POST /api/upload]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
