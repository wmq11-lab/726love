/** 单张图片最大上传大小 */
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/** 单个视频最大上传大小 */
export const MAX_VIDEO_SIZE_MB = 50;
export const MAX_VIDEO_SIZE = MAX_VIDEO_SIZE_MB * 1024 * 1024;

/** 每条记忆最多上传媒体数（图片 + 视频合计） */
export const MAX_IMAGES_PER_RECORD = 9;
export const MAX_MEDIA_PER_RECORD = MAX_IMAGES_PER_RECORD;

/** 单次批量导入最多处理图片数（批量模式仍仅支持图片） */
export const MAX_BATCH_IMAGES = 500;

/** 批量导入时的图片上传并发数 */
export const BATCH_UPLOAD_CONCURRENCY = 4;

/** 文件选择器：图片 + 常见视频 */
export const MEDIA_ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,video/x-m4v';
