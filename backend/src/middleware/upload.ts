import multer from 'multer';

// Store uploaded files in memory — we parse them immediately and don't persist to disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
});
