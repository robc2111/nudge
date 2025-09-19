const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function s3PutJson(bucket, key, json) {
  const Body = Buffer.from(JSON.stringify(json, null, 2), 'utf8');
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body,
      ContentType: 'application/json',
    })
  );
}

async function s3SignedUrl(bucket, key, seconds) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: seconds });
}

module.exports = { s3PutJson, s3SignedUrl };
