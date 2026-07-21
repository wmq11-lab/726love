/** 单张图片最大上传大小 */
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/** 每条记忆最多上传图片数 */
export const MAX_IMAGES_PER_RECORD = 9;

/** 单次批量导入最多处理图片数 */
export const MAX_BATCH_IMAGES = 500;

/** 批量导入时的图片上传并发数 */
export const BATCH_UPLOAD_CONCURRENCY = 4;
