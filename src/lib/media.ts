/** 媒体类型：复用 record_images.template_style === 'video'，无需强制迁移 */

export type MediaKind = 'image' | 'video';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isAllowedMediaFile(file: File): boolean {
  return isImageFile(file) || isVideoFile(file);
}

export function detectMediaKind(file: File): MediaKind {
  return isVideoFile(file) ? 'video' : 'image';
}

export function isVideoMedia(item: {
  media_type?: string | null;
  template_style?: string | null;
  storage_key?: string | null;
}): boolean {
  if (item.media_type === 'video' || item.template_style === 'video') return true;
  const key = item.storage_key || '';
  if (key.startsWith('data:video/')) return true;
  return VIDEO_EXT.test(key);
}
