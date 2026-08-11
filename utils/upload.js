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

module.exports = {
  heroUpload,
  registrationUpload,
  propertyUpload,
  promotionUpload,
  bookingPaymentUpload,
  bankDocsUpload,
};
