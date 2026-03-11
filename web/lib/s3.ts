import { S3Client, PutObjectCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3"

const BUCKET = process.env.AWS_S3_BUCKET || "advoga-site"
const ENV_REGION = process.env.AWS_REGION || "us-east-1"

const clientsByRegion = new Map<string, S3Client>()
let resolvedRegion: string | null = null

function getClient(region: string) {
  const existing = clientsByRegion.get(region)
  if (existing) return existing
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  })
  clientsByRegion.set(region, client)
  return client
}

async function detectBucketRegion(): Promise<string> {
  if (resolvedRegion) return resolvedRegion
  // Try ENV region first; if it's wrong, AWS will return the actual region in GetBucketLocation
  const probeClient = getClient(ENV_REGION)
  try {
    const out = await probeClient.send(
      new GetBucketLocationCommand({ Bucket: BUCKET })
    )
    // us-east-1 returns null/undefined
    const loc = out.LocationConstraint || "us-east-1"
    // Legacy "EU" mapping
    resolvedRegion = loc === "EU" ? "eu-west-1" : loc
    return resolvedRegion
  } catch {
    // Fallback to env region if detection fails
    resolvedRegion = ENV_REGION
    return resolvedRegion
  }
}

function buildPublicUrl(region: string, key: string): string {
  const encodedKey = encodeURIComponent(key)
  // us-east-1 special-case endpoint
  if (region === "us-east-1") {
    return `https://${BUCKET}.s3.amazonaws.com/${encodedKey}`
  }
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${encodedKey}`
}

export async function uploadToS3(params: {
  key: string
  contentType: string
  body: Buffer | Uint8Array | Blob | string
  cacheControl?: string
}) {
  const region = await detectBucketRegion()
  const s3 = getClient(region)
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    CacheControl: params.cacheControl,
  })
  await s3.send(command)
  const publicUrl = buildPublicUrl(region, params.key)
  return { url: publicUrl }
}


