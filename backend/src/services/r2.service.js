const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '08fe264dc2bd7ad8363433687d94ff41';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '62750c19a40263b8a9056d52f938ca49';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '4d6bbf31ca50db47e372ca85578e13b13f1af71d4140faa013217c9385b5a3a9';
const R2_BUCKET = process.env.R2_BUCKET || 'giaohangsieutoc';
const R2_ENDPOINT =
  process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || 'https://pub-5713e2a7aacb4f8fa6d18d2e4a2b90ba.r2.dev').replace(
  /\/$/,
  ''
);

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a Buffer directly to Cloudflare R2
 * @param {Buffer} buffer
 * @param {string} key
 * @param {string} contentType
 * @returns {Promise<{ key: string, publicUrl: string, bucket: string }>}
 */
async function uploadBuffer(buffer, key, contentType = 'application/octet-stream') {
  const cleanKey = key.replace(/^\/+/, '');
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: cleanKey,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return {
    key: cleanKey,
    publicUrl: `${R2_PUBLIC_URL}/${cleanKey}`,
    bucket: R2_BUCKET,
  };
}

/**
 * Upload a local file from disk to Cloudflare R2
 * @param {string} filePath
 * @param {string} key
 * @param {string} contentType
 * @returns {Promise<{ key: string, publicUrl: string, bucket: string }>}
 */
async function uploadFile(filePath, key, contentType = 'application/octet-stream') {
  const fileBuffer = fs.readFileSync(filePath);
  return uploadBuffer(fileBuffer, key, contentType);
}

/**
 * Get an object stream from Cloudflare R2
 * @param {string} key
 * @returns {Promise<{ stream: any, contentType: string, contentLength: number }>}
 */
async function getObjectStream(key) {
  const cleanKey = key.replace(/^\/+/, '');
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: cleanKey,
  });

  const response = await s3Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

/**
 * Delete an object from Cloudflare R2
 * @param {string} key
 */
async function deleteObject(key) {
  const cleanKey = key.replace(/^\/+/, '');
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: cleanKey,
  });

  return s3Client.send(command);
}

module.exports = {
  s3Client,
  uploadBuffer,
  uploadFile,
  getObjectStream,
  deleteObject,
  R2_BUCKET,
  R2_PUBLIC_URL,
  R2_ENDPOINT,
};
