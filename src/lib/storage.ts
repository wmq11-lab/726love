import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getBucketConfig() {
  return {
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey:
      process.env.COZE_BUCKET_ACCESS_KEY ||
      process.env.AWS_ACCESS_KEY_ID ||
      '',
    secretKey:
      process.env.COZE_BUCKET_SECRET_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      '',
    bucketName: process.env.COZE_BUCKET_NAME,
    region: process.env.COZE_BUCKET_REGION || 'auto',
  };
}

function createS3Client(): S3Client | null {
  const { endpointUrl, accessKey, secretKey, region } = getBucketConfig();
  if (!endpointUrl || !accessKey || !secretKey) return null;

  return new S3Client({
    region,
    endpoint: endpointUrl,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}

/** 创建 S3 兼容对象存储客户端（Cloudflare R2 等） */
export async function getStorage() {
  const config = getBucketConfig();
  const client = createS3Client();
  if (!client || !config.bucketName) {
    throw new Error('对象存储未配置，请设置 COZE_BUCKET_* 环境变量');
  }

  return {
    async uploadFile(params: {
      fileContent: Buffer | Uint8Array;
      fileName: string;
      contentType?: string;
    }) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName!,
          Key: params.fileName,
          Body: params.fileContent,
          ContentType: params.contentType,
        }),
      );
      return params.fileName;
    },
  };
}

/** 是否已配置可用的对象存储 */
export function isObjectStorageConfigured(): boolean {
  const { endpointUrl, bucketName, accessKey, secretKey } = getBucketConfig();
  return Boolean(endpointUrl && bucketName && accessKey && secretKey);
}

/** 生成图片访问签名 URL（兼容 R2） */
export async function generateImageUrl(
  key: string,
  expireTime = 86400,
): Promise<string | null> {
  if (!key || key.startsWith('data:')) return key;

  const { bucketName } = getBucketConfig();
  const client = createS3Client();
  if (!client || !bucketName) return null;

  try {
    const sign = getSignedUrl as (
      c: unknown,
      cmd: unknown,
      opts: { expiresIn: number },
    ) => Promise<string>;
    return await sign(
      client,
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
      { expiresIn: expireTime },
    );
  } catch {
    return null;
  }
}
