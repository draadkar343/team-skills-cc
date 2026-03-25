const multer = require('multer');
const path = require('path');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, svg, webp)'), false);
  }
};

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});

const certFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'), false);
  }
};

const certStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cert_${req.user.id}_${Date.now()}${ext}`);
  },
});

const csvFilter = (_req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const logoUpload = multer({ storage: logoStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const avatarUpload = multer({ storage: avatarStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const certificateUpload = multer({ storage: certStorage, fileFilter: certFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const csvUpload = multer({ storage: multer.memoryStorage(), fileFilter: csvFilter, limits: { fileSize: 2 * 1024 * 1024 } });

module.exports = logoUpload;
module.exports.avatarUpload = avatarUpload;
module.exports.certificateUpload = certificateUpload;
module.exports.csvUpload = csvUpload;
