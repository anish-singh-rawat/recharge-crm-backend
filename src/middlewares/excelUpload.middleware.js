import multer from 'multer';
import path from 'path';
import { BusinessError } from '../helpers/error.helper.js';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                         // .xls
  'text/csv',                                                          // .csv
  'application/csv',
  'application/octet-stream',
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const storage = multer.memoryStorage();

const excelFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new BusinessError(`Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.`),
      false
    );
  }
  cb(null, true);
};

export const uploadExcel = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: excelFileFilter,
}).single('file');

export const excelUploadMiddleware = (req, res, next) => {
  uploadExcel(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new BusinessError('Excel file exceeds 25MB limit. Please upload a smaller file.'));
    }
    return next(err);
  });
};
