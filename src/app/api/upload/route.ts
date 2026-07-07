export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStorage, generateImageUrl, isObjectStorageConfigured } from '@/lib/storage';
import { MAX_IMAGE_SIZE, MAX_IMAGE_SIZE_MB } from '@/lib/upload';
import { logger } from '@/lib/logger';

/** 无对象存储时，允许 base64 降级的最大体积（超过则必须配置 R2/S3） */
const MAX_BASE64_FALLBACK_SIZE = 200 * 1024;

/** 判断 storage_key 是否为 base64 data URL（不需要签名） */
function isDataUrl(key: string) {
  return key.startsWith('data:');
}

// GET /api/upload — 获取图片签名URL
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
      return NextResponse.json({ success: false, error: '生成图片访问链接失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    logger.error('[GET /api/upload]', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** 带超时的 S3 上传，失败或超时返回 null */
async function tryUploadToS3(buffer: Buffer, fileName: string, contentType: string): Promise<string | null> {
  if (!isObjectStorageConfigured()) return null;

  try {
    const storage = await getStorage();
    const uploadPromise = storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType,
    });
    const result = await Promise.race([
      uploadPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('S3_TIMEOUT')), 15000)),
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

function storageUnavailableError(fileSize: number): string {
  if (!isObjectStorageConfigured()) {
    return `图片存储未配置。请在 .env 中填写 COZE_BUCKET_*（推荐 Cloudflare R2），当前图片 ${(fileSize / 1024 / 1024).toFixed(1)}MB 无法存入数据库。`;
  }
  return '图片上传到对象存储失败，请检查 COZE_BUCKET_* 配置后重试。';
}

// POST /api/upload — 上传图片（S3 优先，小图可降级 base64）
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

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 ${MAX_IMAGE_SIZE_MB}MB`,
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `love-records/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name}`;

    let storageKey: string | null = await tryUploadToS3(buffer, fileName, file.type);
    let url: string | null = null;

    if (storageKey) {
      url = await generateImageUrl(storageKey, 86400 * 7);
    } else if (file.size <= MAX_BASE64_FALLBACK_SIZE) {
      url = toDataUrl(buffer, file.type);
      storageKey = url;
    } else {
      return NextResponse.json({
        success: false,
        error: storageUnavailableError(file.size),
      }, { status: 400 });
    }

    if (recordId) {
      const { getSupabaseClient } = await import('@/storage/database/supabase-client');
      const client = getSupabaseClient();

      const { error: dbError } = await client.from('record_images').insert({
        record_id: recordId,
        storage_key: storageKey,
        caption: caption || '',
        template_style: templateStyle || 'polaroid',
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      });

      if (dbError) throw new Error(`保存图片记录失败: ${dbError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: { storage_key: storageKey, url: url || storageKey },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[POST /api/upload]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
