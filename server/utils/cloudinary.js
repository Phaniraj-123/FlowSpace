const cloudinary = require('cloudinary').v2
const https = require('https')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

const agent = new https.Agent({ rejectUnauthorized: false })

async function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    let resourceType = 'image'
    if (mimetype.startsWith('video')) resourceType = 'video'
    if (mimetype.startsWith('audio')) resourceType = 'video'

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'flowspace',
        agent
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result.secure_url)
      }
    )
    uploadStream.end(buffer)
  })
}

module.exports = { uploadToCloudinary }