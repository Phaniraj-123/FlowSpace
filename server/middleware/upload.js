const multer = require('multer')

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for voice
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`File type ${file.mimetype} not allowed`))
  }
})

module.exports = upload

