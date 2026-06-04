import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { RouteShape } from '../../../shared/types';

const s3 = new S3Client({});

export async function readShape(routeId: string): Promise<RouteShape | null> {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.SHAPES_BUCKET_NAME!,
      Key: `shapes/${routeId}.json`,
    }));
    const body = await response.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as RouteShape;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null;
    throw err;
  }
}
