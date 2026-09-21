'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const heroStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(__dirname, '../uploads/hero');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `hero-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed.'));
  }
};

const heroUpload = multer({
  storage: heroStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const registrationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(__dirname, '../uploads/registrations');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeField = String(file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${safeField}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const registrationDocFilter = (_req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedDocs = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (file.fieldname === 'profilePhoto') {
    if (allowedImages.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Profile photo must be JPEG, JPG, PNG, or WEBP.'));
  }

  if (allowedDocs.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('Proof documents must be PDF, JPG, JPEG, or PNG.'));
};

const registrationUpload = multer({
  storage: registrationStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: registrationDocFilter,
});

const propertyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(__dirname, '../uploads/properties');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `property-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const propertyUpload = multer({
  storage: propertyStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const promotionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(__dirname, '../uploads/promotions');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `promo-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const promotionUpload = multer({
  storage: promotionStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const bookingPaymentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(__dirname, '../uploads/booking-payments');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `pay-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const bookingPaymentUpload = multer({
  storage: bookingPaymentStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const bankDocsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.resolve(__dirname, '../uploads/bank-docs');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeField = String(file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${safeField}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const bankDocsFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('Bank documents must be JPEG, JPG, PNG, WEBP, or PDF.'));
};

const bankDocsUpload = multer({
  storage: bankDocsStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: bankDocsFilter,
});

/**
 * Property documents (PDFs) are stored OUTSIDE the `uploads/` directory, which is
 * served publicly via `express.static` in app.js. This directory is never mounted
 * as static and files are only ever streamed out through an authenticated route.
 */
const PROPERTY_DOCUMENTS_DIR = path.resolve(__dirname, '../private-uploads/property-documents');

const propertyDocumentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(PROPERTY_DOCUMENTS_DIR);
    cb(null, PROPERTY_DOCUMENTS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `document-${uniqueSuffix}.pdf`);
  },
});

const PROPERTY_DOCUMENT_MAX_SIZE_MB = Number(process.env.PROPERTY_DOCUMENT_MAX_SIZE_MB) || 20;

const propertyDocumentFilter = (_req, file, cb) => {
  const extOk = path.extname(file.originalname || '').toLowerCase() === '.pdf';
  const mimeOk = file.mimetype === 'application/pdf';
  if (extOk && mimeOk) return cb(null, true);
  const err = new Error('Only PDF files are allowed for property documents.');
  err.status = 400;
  err.code = 'INVALID_FILE_TYPE';
  return cb(err);
};

const propertyDocumentUpload = multer({
  storage: propertyDocumentStorage,
  limits: { fileSize: PROPERTY_DOCUMENT_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: propertyDocumentFilter,
});

/**
 * Server-side content sniff: confirms the uploaded bytes actually start with the
 * PDF magic header, since neither the extension nor the client-supplied MIME type
 * can be trusted on their own.
 */
function isPdfFile(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    const bytesRead = fs.readSync(fd, buffer, 0, 5, 0);
    return bytesRead === 5 && buffer.toString('utf8') === '%PDF-';
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
}

module.exports = {
  heroUpload,
  registrationUpload,
  propertyUpload,
  promotionUpload,
  bookingPaymentUpload,
  bankDocsUpload,
  propertyDocumentUpload,
  PROPERTY_DOCUMENTS_DIR,
  PROPERTY_DOCUMENT_MAX_SIZE_MB,
  isPdfFile,
};
