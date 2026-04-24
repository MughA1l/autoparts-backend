const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

// Ensure upload directory exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'products';
    if (file.fieldname === 'avatar') folder = 'avatars';
    else if (file.fieldname === 'media') folder = 'chat';
    
    const uploadPath = path.join(__dirname, '../../uploads', folder);
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'media') {
    const allowedMediaTypes = /jpeg|jpg|png|webp|gif|mp4|webm|ogg|mp3|wav|mpeg/;
    const extname = allowedMediaTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMediaTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new ApiError('Only image, video, and audio files are allowed for media', 400), false);
    }
  }

  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new ApiError('Only image files are allowed (jpeg, jpg, png, webp, gif)', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;
