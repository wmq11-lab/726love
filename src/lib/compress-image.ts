/** 浏览器端压缩图片，减小上传体积与后续列表加载耗时 */

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.78;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解码失败'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      type,
      quality,
    );
  });
}

/**
 * 将图片等比缩放到最长边不超过 maxEdge，并转为 JPEG。
 * 已足够小的图片会原样返回（避免无谓重编码）。
 */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; quality?: number; minBytesToCompress?: number },
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const minBytes = options?.minBytesToCompress ?? 400 * 1024;

  // 小图且尺寸通常不大时跳过，保留原格式
  if (file.size < minBytes && file.type === 'image/jpeg') {
    return file;
  }

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    // 已经很小且几乎不用缩小
    if (scale >= 1 && file.size < minBytes) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);

    // 压缩后反而更大则保留原文件
    if (blob.size >= file.size * 0.95) {
      return file;
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
