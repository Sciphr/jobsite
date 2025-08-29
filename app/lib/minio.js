// app/lib/minio.js - MinIO client for file storage
import * as Minio from 'minio'

// Initialize MinIO client
export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const bucketName = process.env.MINIO_BUCKET_NAME || 'resumes'

// Ensure bucket exists
export async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName)
    if (!exists) {
      await minioClient.makeBucket(bucketName)
      console.log(`✅ Created MinIO bucket: ${bucketName}`)
      
      // Set bucket policy to allow public read for certain files if needed
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/public/*`]
          }
        ]
      }
      
      // Apply policy (optional - only if you need public access)
      // await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy))
    }
  } catch (error) {
    console.error('❌ MinIO bucket setup error:', error)
    throw error
  }
}

// File upload utilities
export const fileStorage = {
  // Upload file to MinIO
  async uploadFile(fileName, fileBuffer, contentType = 'application/octet-stream', metadata = {}) {
    await ensureBucketExists()
    
    try {
      const result = await minioClient.putObject(
        bucketName,
        fileName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
          ...metadata
        }
      )
      
      console.log(`✅ File uploaded to MinIO: ${fileName}`)
      return {
        success: true,
        fileName,
        etag: result.etag,
        url: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`
      }
    } catch (error) {
      console.error('❌ MinIO upload error:', error)
      throw error
    }
  },

  // Download file from MinIO
  async downloadFile(fileName) {
    try {
      const stream = await minioClient.getObject(bucketName, fileName)
      return stream
    } catch (error) {
      console.error('❌ MinIO download error:', error)
      throw error
    }
  },

  // Delete file from MinIO
  async deleteFile(fileName) {
    try {
      await minioClient.removeObject(bucketName, fileName)
      console.log(`✅ File deleted from MinIO: ${fileName}`)
      return { success: true }
    } catch (error) {
      console.error('❌ MinIO delete error:', error)
      throw error
    }
  },

  // Generate presigned URL for secure access
  async getPresignedUrl(fileName, expiry = 24 * 60 * 60) { // 24 hours default
    try {
      const url = await minioClient.presignedGetObject(bucketName, fileName, expiry)
      return url
    } catch (error) {
      console.error('❌ MinIO presigned URL error:', error)
      throw error
    }
  },

  // List files in bucket
  async listFiles(prefix = '') {
    try {
      const files = []
      const stream = minioClient.listObjects(bucketName, prefix, true)
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => files.push(obj))
        stream.on('end', () => resolve(files))
        stream.on('error', reject)
      })
    } catch (error) {
      console.error('❌ MinIO list files error:', error)
      throw error
    }
  },

  // Get file stats
  async getFileStats(fileName) {
    try {
      const stats = await minioClient.statObject(bucketName, fileName)
      return stats
    } catch (error) {
      console.error('❌ MinIO file stats error:', error)
      throw error
    }
  }
}

export default fileStorage