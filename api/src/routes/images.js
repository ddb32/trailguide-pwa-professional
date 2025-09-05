const express = require('express');
const path = require('path');
const fs = require('fs');
const { uploadsDir } = require('../middleware/upload');

const router = express.Router();

// GET /api/v1/images/:filename - Serve uploaded images
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Only allow specific file extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }
    
    // Security: Prevent directory traversal attacks
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Set appropriate content type based on file extension
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const contentType = contentTypeMap[fileExtension] || 'application/octet-stream';
    
    // Set caching headers for better performance
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      'ETag': `"${filename}"`
    });
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error serving image'
        });
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Image serving error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;