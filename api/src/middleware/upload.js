const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Multer storage destination called:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      uploadsDir,
      uploadsDirExists: fs.existsSync(uploadsDir)
    });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `event-${uniqueSuffix}${extension}`;
    
    console.log('📝 Multer filename generated:', {
      originalname: file.originalname,
      generatedFilename: filename,
      extension,
      fieldname: file.fieldname
    });
    
    cb(null, filename);
  }
});

// Enhanced file validation with magic number checking
const validateFileContent = (buffer, mimetype, originalname) => {
  // Magic numbers for file type validation
  const magicNumbers = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF header for WebP
  };

  if (!buffer || buffer.length < 4) {
    return { valid: false, reason: 'Insufficient file data' };
  }

  const magic = magicNumbers[mimetype];
  if (!magic) {
    return { valid: false, reason: 'Unsupported file type' };
  }

  // Check magic numbers
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) {
      return { valid: false, reason: 'File content does not match declared type' };
    }
  }

  // Additional validation for specific formats
  if (mimetype === 'image/webp') {
    // Check for WEBP signature at offset 8
    const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
    if (buffer.length >= 12) {
      for (let i = 0; i < webpSignature.length; i++) {
        if (buffer[8 + i] !== webpSignature[i]) {
          return { valid: false, reason: 'Invalid WebP file format' };
        }
      }
    }
  }

  return { valid: true };
};

// File filter for image validation
const fileFilter = (req, file, cb) => {
  console.log('🔍 Validating file upload:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size || 'unknown'
  });

  // Security: Validate file extension matches MIME type
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    console.log('❌ File extension rejected:', fileExtension);
    cb(new Error('INVALID_FILE_EXTENSION'), false);
    return;
  }

  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    // Accept common image formats
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      // Security: Validate MIME type matches file extension
      const expectedMimeTypes = {
        '.jpg': ['image/jpeg'],
        '.jpeg': ['image/jpeg'],
        '.png': ['image/png'],
        '.gif': ['image/gif'],
        '.webp': ['image/webp']
      };

      if (expectedMimeTypes[fileExtension] &&
          expectedMimeTypes[fileExtension].includes(file.mimetype)) {
        console.log('✅ File type and extension validated:', file.mimetype);
        cb(null, true);
      } else {
        console.log('❌ MIME type does not match extension:', {
          extension: fileExtension,
          mimetype: file.mimetype
        });
        cb(new Error('MIME_TYPE_MISMATCH'), false);
      }
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error('INVALID_FILE_TYPE'), false);
    }
  } else {
    console.log('❌ Non-image file rejected:', file.mimetype);
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

// Configure multer with storage, file filter, and limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file per upload
  }
});

// Middleware for single image upload with debugging
const uploadSingleImage = (req, res, next) => {
  console.log('🚀 Starting multer upload processing:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    eventId: req.params.id,
    timestamp: new Date().toISOString()
  });

  const multerSingle = upload.single('coverImage');
  multerSingle(req, res, (err) => {
    if (err) {
      console.error('❌ Multer processing error:', {
        type: err.constructor.name,
        message: err.message,
        code: err.code,
        field: err.field,
        stack: err.stack
      });
      return next(err);
    }

    // Enhanced content validation after upload
    if (req.file) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const validation = validateFileContent(fileBuffer, req.file.mimetype, req.file.originalname);

        if (!validation.valid) {
          console.error('❌ File content validation failed:', {
            filename: req.file.filename,
            reason: validation.reason,
            mimetype: req.file.mimetype
          });

          // Clean up the invalid file
          fs.unlinkSync(req.file.path);

          const error = new Error('INVALID_FILE_CONTENT');
          error.reason = validation.reason;
          return next(error);
        }

        console.log('✅ File content validation passed:', {
          filename: req.file.filename,
          mimetype: req.file.mimetype
        });
      } catch (validationError) {
        console.error('❌ File validation error:', validationError);

        // Clean up the file on validation error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        return next(new Error('FILE_VALIDATION_ERROR'));
      }
    }

    console.log('✅ Multer processing completed:', {
      hasFile: !!req.file,
      fileDetails: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null,
      bodyFields: Object.keys(req.body || {})
    });

    next();
  });
};

// Middleware for step image upload
const uploadStepImage = upload.single('stepImage');

// Error handling middleware for multer errors
const handleUploadError = (err, req, res, next) => {
  console.log('🚨 Upload error detected:', {
    type: err.constructor.name,
    code: err.code,
    message: err.message,
    field: err.field || 'unknown'
  });
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      console.log('❌ File size exceeded:', err.field, 'max: 5MB');
      return res.status(400).json({
        success: false,
        message: req.t ? req.t('upload:errors.fileTooLarge') : 'File size too large. Maximum size is 5MB.',
        error: 'FILE_TOO_LARGE',
        details: { maxSize: '5MB', field: err.field }
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: req.t ? req.t('upload:limits.maxFiles') : 'Too many files. Only one image is allowed.',
        error: 'TOO_MANY_FILES'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: req.t ? req.t('upload:errors.uploadFailed') : 'Unexpected field name. Use "coverImage" for the file field.',
        error: 'UNEXPECTED_FIELD'
      });
    }
  }
  
  if (err.message.includes('INVALID_FILE_TYPE')) {
    return res.status(400).json({
      success: false,
      message: req.t ? req.t('upload:errors.invalidFileType') : 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
      error: 'INVALID_FILE_TYPE'
    });
  }

  if (err.message.includes('INVALID_FILE_EXTENSION')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp files are allowed.',
      error: 'INVALID_FILE_EXTENSION'
    });
  }

  if (err.message.includes('MIME_TYPE_MISMATCH')) {
    return res.status(400).json({
      success: false,
      message: 'File type mismatch. The file extension does not match the file content.',
      error: 'MIME_TYPE_MISMATCH'
    });
  }

  if (err.message.includes('INVALID_FILE_CONTENT')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file content. The file appears to be corrupted or is not a valid image.',
      error: 'INVALID_FILE_CONTENT',
      details: err.reason || 'File content validation failed'
    });
  }

  if (err.message.includes('FILE_VALIDATION_ERROR')) {
    return res.status(400).json({
      success: false,
      message: 'File validation error. Please try uploading a different image.',
      error: 'FILE_VALIDATION_ERROR'
    });
  }
  
  // Pass other errors to next middleware
  next(err);
};

// Helper function to delete uploaded file (for cleanup on errors)
const deleteUploadedFile = (filename) => {
  if (filename) {
    const filePath = path.join(uploadsDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Failed to delete uploaded file:', err);
      }
    });
  }
};

module.exports = {
  uploadSingleImage,
  uploadStepImage,
  handleUploadError,
  deleteUploadedFile,
  uploadsDir
};