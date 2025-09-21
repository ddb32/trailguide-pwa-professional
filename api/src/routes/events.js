const express = require('express');
const { body, param, query: expressQuery, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingleImage, handleUploadError, deleteUploadedFile } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation schemas
const eventValidation = [
  body('event_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage((value, { req }) => req.t('validation:event.nameLength')),
  body('metadata.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage((value, { req }) => req.t('validation:event.descriptionLength')),
  body('metadata.location')
    .optional()
    .isLength({ max: 255 })
    .withMessage((value, { req }) => req.t('validation:event.locationLength')),
  body('expiration_date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage((value, { req }) => req.t('validation:event.expirationDateInvalid')),
  body('expiration_hours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .toInt()
    .withMessage((value, { req }) => req.t('validation:event.expirationHoursRange'))
];

const eventUpdateValidation = [
  body('event_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage((value, { req }) => req.t('validation:event.nameLength')),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'expired', 'archived'])
    .withMessage((value, { req }) => req.t('validation:event.statusInvalid')),
  body('metadata.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage((value, { req }) => req.t('validation:event.descriptionLength')),
  body('expiration_date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage((value, { req }) => req.t('validation:event.expirationDateInvalid')),
  body('expiration_hours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .toInt()
    .withMessage((value, { req }) => req.t('validation:event.expirationHoursRange'))
];

const uuidValidation = [
  param('id')
    .isUUID()
    .withMessage((value, { req }) => req.t('validation:event.idInvalid'))
];

const stepValidation = [
  body('step_order')
    .isInt({ min: 1 })
    .withMessage((value, { req }) => req.t('validation:step.orderPositive')),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage((value, { req }) => req.t('validation:step.descriptionLength')),
  body('image_url')
    .optional()
    .isURL()
    .withMessage((value, { req }) => req.t('validation:general.invalidFormat')),
  body('image_alt')
    .optional()
    .isLength({ max: 500 })
    .withMessage((value, { req }) => req.t('validation:general.valueTooLong')),
  body('metadata')
    .optional()
    .isObject()
    .withMessage((value, { req }) => req.t('validation:general.invalidFormat'))
];

// Helper function to generate slug from event name (Hebrew-friendly)
function generateSlug(eventName) {
  // First try to create a meaningful slug from ASCII characters only
  const asciiSlug = eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  // If we got a meaningful slug (at least 2 characters), use it
  if (asciiSlug && asciiSlug.length >= 2) {
    return asciiSlug;
  }
  
  // For Hebrew or other non-ASCII text, create a UUID-based slug
  const shortUuid = uuidv4().split('-')[0]; // First 8 characters of UUID
  
  // Try to extract some meaning from the original name
  const cleanName = eventName.trim().replace(/\s+/g, '');
  if (cleanName.length > 0) {
    // Create a hash-like identifier from the original name
    const nameHash = cleanName
      .split('')
      .reduce((hash, char) => {
        const charCode = char.charCodeAt(0);
        return ((hash << 5) - hash + charCode) & 0xffffffff;
      }, 0);
    
    // Convert to positive number and take last 4 digits
    const hashSuffix = Math.abs(nameHash).toString().slice(-4);
    return `guide-${shortUuid}-${hashSuffix}`;
  }
  
  // Fallback to simple UUID-based slug
  return `guide-${shortUuid}`;
}

// GET /api/v1/events - List user's events with pagination
router.get('/', authenticateToken, [
  expressQuery('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  expressQuery('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  expressQuery('status')
    .optional()
    .isIn(['draft', 'published', 'expired', 'archived'])
    .withMessage('Invalid status filter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;

    let whereClause = 'WHERE organizer_id = $1';
    let queryParams = [req.user.id];
    
    if (statusFilter) {
      whereClause += ' AND status = $2';
      queryParams.push(statusFilter);
    }

    // Get events with step count
    const eventsQuery = `
      SELECT 
        e.id,
        e.event_name,
        e.slug,
        e.status,
        e.expiration_date,
        e.clicks_count,
        e.unique_visitors_count,
        e.completion_count,
        e.metadata,
        e.is_featured,
        e.created_at,
        e.updated_at,
        COUNT(s.id)::int as steps_count
      FROM events e
      LEFT JOIN steps s ON e.id = s.event_id
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM events e
      ${whereClause}
    `;

    const [eventsResult, countResult] = await Promise.all([
      query(eventsQuery, queryParams),
      query(countQuery, queryParams.slice(0, statusFilter ? 2 : 1))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        events: eventsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      },
      message: req.t('api:events.retrieveSuccess'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: req.t('api:events.retrieveFailed')
    });
  }
});

// GET /api/v1/events/:id - Get single event with steps
router.get('/:id', authenticateToken, uuidValidation, async (req, res) => {
  try {
    console.log('📥 GET /events/:id request received:', {
      eventId: req.params.id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      timestamp: new Date().toISOString()
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation failed for GET /events/:id:', {
        eventId: req.params.id,
        errors: errors.array()
      });
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id } = req.params;

    console.log('🔍 Querying event details:', {
      eventId: id,
      organizerId: req.user.id
    });

    // Get event details with expiration status
    const eventResult = await query(`
      SELECT
        id,
        event_name,
        slug,
        status,
        expiration_date,
        clicks_count,
        unique_visitors_count,
        completion_count,
        metadata,
        cover_image_url,
        cover_image_alt,
        is_featured,
        created_at,
        updated_at,
        organizer_id,
        CASE
          WHEN expiration_date IS NOT NULL AND expiration_date <= NOW() THEN true
          ELSE false
        END as is_expired
      FROM events
      WHERE id = $1 AND organizer_id = $2
    `, [id, req.user.id]);

    console.log('📊 Event query result:', {
      eventId: id,
      rowsFound: eventResult.rows.length,
      organizerId: req.user.id
    });

    if (eventResult.rows.length === 0) {
      console.error('❌ Event not found or access denied:', {
        eventId: id,
        organizerId: req.user.id,
        userEmail: req.user.email
      });
      return res.status(404).json({
        success: false,
        message: req.t('api:events.notFound')
      });
    }

    const event = eventResult.rows[0];

    console.log('📋 Event found, querying steps:', {
      eventId: id,
      eventName: event.event_name,
      status: event.status,
      hasCoverImage: !!event.cover_image_url
    });

    // Get steps for this event
    const stepsResult = await query(`
      SELECT 
        id,
        step_order,
        image_url,
        image_alt,
        description,
        view_count,
        completion_count,
        metadata,
        created_at,
        updated_at
      FROM steps
      WHERE event_id = $1
      ORDER BY step_order ASC
    `, [id]);

    console.log('📊 Steps query result:', {
      eventId: id,
      stepsFound: stepsResult.rows.length
    });

    event.steps = stepsResult.rows;

    console.log('✅ Sending complete event data:', {
      eventId: event.id,
      eventName: event.event_name,
      stepsCount: event.steps.length,
      hasCoverImage: !!event.cover_image_url,
      hasMetadata: !!event.metadata,
      isExpired: event.is_expired,
      organizerAccess: true
    });

    res.status(200).json({
      success: true,
      data: event,
      meta: {
        organizer_preview: true,
        is_expired: event.is_expired,
        access_type: 'organizer',
        expiration_date: event.expiration_date
      },
      message: req.t('api:events.retrieveSuccess'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get event error:', {
      eventId: req.params.id,
      userId: req.user?.id,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: req.t('api:events.retrieveFailed'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v1/events/:id/preview - Organizer preview route (always accessible regardless of expiration)
router.get('/:id/preview', authenticateToken, uuidValidation, async (req, res) => {
  try {
    console.log('👁️ GET /events/:id/preview request received:', {
      eventId: req.params.id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      timestamp: new Date().toISOString()
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation failed for GET /events/:id/preview:', {
        eventId: req.params.id,
        errors: errors.array()
      });
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id } = req.params;

    console.log('🔍 Querying event for preview:', {
      eventId: id,
      organizerId: req.user.id
    });

    // Get event details for preview (no expiration filtering)
    const eventResult = await query(`
      SELECT
        id,
        event_name,
        slug,
        status,
        expiration_date,
        clicks_count,
        unique_visitors_count,
        completion_count,
        metadata,
        cover_image_url,
        cover_image_alt,
        is_featured,
        created_at,
        updated_at,
        organizer_id
      FROM events
      WHERE id = $1 AND organizer_id = $2
    `, [id, req.user.id]);

    console.log('📊 Preview query result:', {
      eventId: id,
      rowsFound: eventResult.rows.length,
      organizerId: req.user.id
    });

    if (eventResult.rows.length === 0) {
      console.error('❌ Event not found for preview or access denied:', {
        eventId: id,
        organizerId: req.user.id,
        userEmail: req.user.email
      });
      return res.status(404).json({
        success: false,
        message: req.t('api:events.notFound')
      });
    }

    const event = eventResult.rows[0];

    console.log('📋 Event found for preview, querying steps:', {
      eventId: id,
      eventName: event.event_name,
      status: event.status,
      hasCoverImage: !!event.cover_image_url
    });

    // Get steps for this event
    const stepsResult = await query(`
      SELECT
        id,
        step_order,
        image_url,
        image_alt,
        description,
        view_count,
        completion_count,
        metadata,
        created_at,
        updated_at
      FROM steps
      WHERE event_id = $1
      ORDER BY step_order ASC
    `, [id]);

    console.log('📊 Preview steps query result:', {
      eventId: id,
      stepsFound: stepsResult.rows.length
    });

    event.steps = stepsResult.rows;

    console.log('✅ Sending preview data:', {
      eventId: event.id,
      eventName: event.event_name,
      stepsCount: event.steps.length,
      hasCoverImage: !!event.cover_image_url,
      previewMode: true
    });

    // Return data in the same format as the public route for consistent frontend handling
    res.status(200).json({
      success: true,
      data: event,
      message: req.t('api:events.retrieveSuccess'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Preview route error:', {
      eventId: req.params.id,
      userId: req.user?.id,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: req.t('api:events.retrieveFailed'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/v1/events/text-only - Create new event without image upload (reliable)
router.post('/text-only', authenticateToken, eventValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { event_name, description, location, status, expiration_date, expiration_hours } = req.body;
    
    const trimmedEventName = event_name.trim();
    const slug = generateSlug(trimmedEventName);
    
    // Set expiration date based on status and user preferences
    let defaultExpirationDate = null;
    
    // Only set expiration for published guides
    if (status === 'published') {
      if (expiration_date) {
        // Use provided expiration date
        const expDate = new Date(expiration_date);
        if (isNaN(expDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid expiration date format',
            errors: [{ path: 'expiration_date', msg: 'Invalid date format' }]
          });
        }
        // Validate expiration date is not in the past and not more than 24 hours
        const now = new Date();
        const maxExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (expDate <= now) {
          return res.status(400).json({
            success: false,
            message: 'Expiration date cannot be in the past',
            errors: [{ path: 'expiration_date', msg: 'Expiration date must be in the future' }]
          });
        }
        if (expDate > maxExpiration) {
          return res.status(400).json({
            success: false,
            message: 'Expiration date cannot be more than 24 hours from now',
            errors: [{ path: 'expiration_date', msg: 'Maximum expiration is 24 hours' }]
          });
        }
        defaultExpirationDate = expDate;
      } else if (expiration_hours) {
        // Use custom hours (1-24 hour range)
        const hours = Math.max(1, Math.min(24, expiration_hours));
        defaultExpirationDate = new Date(Date.now() + hours * 60 * 60 * 1000);
      } else {
        // Default to 24 hours from now for published guides
        defaultExpirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }
    // For draft status, defaultExpirationDate remains null (no expiration)

    // Build metadata object (no image initially)
    const metadata = {};
    if (description) metadata.description = description.trim();
    if (location) metadata.location = location.trim();

    console.log('📝 Creating text-only event:', {
      event_name: trimmedEventName,
      status: status || 'draft',
      hasDescription: !!description,
      hasLocation: !!location
    });

    // Use proper transaction management for event creation
    const client = await getClient();
    let newEvent;
    
    try {
      console.log('🔄 Starting transaction for event creation...');
      await client.query('BEGIN');
      
      // Set statement timeout to prevent stuck transactions
      await client.query('SET statement_timeout = 30000'); // 30 seconds
      
      // Check for duplicate slugs and handle conflicts
      const slugCheckResult = await client.query(
        'SELECT id FROM events WHERE slug = $1 AND organizer_id = $2',
        [slug, req.user.id]
      );
      
      let finalSlug = slug;
      if (slugCheckResult.rows.length > 0) {
        // Generate unique slug with timestamp
        finalSlug = `${slug}-${Date.now()}`;
        console.log(`🔄 Slug conflict detected, using unique slug: ${finalSlug}`);
      }
      
      // Insert event with comprehensive error handling
      const result = await client.query(`
        INSERT INTO events (organizer_id, event_name, slug, metadata, expiration_date, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id,
          event_name,
          slug,
          status,
          expiration_date,
          clicks_count,
          unique_visitors_count,
          completion_count,
          metadata,
          is_featured,
          created_at,
          updated_at
      `, [req.user.id, trimmedEventName, finalSlug, JSON.stringify(metadata), defaultExpirationDate, status || 'draft']);

      if (result.rows.length === 0) {
        throw new Error('Event creation failed - no data returned');
      }

      newEvent = result.rows[0];
      
      // Validate the created event data
      if (!newEvent.id || !newEvent.event_name) {
        throw new Error('Event creation failed - invalid data returned');
      }
      
      // Add empty steps array for consistency
      newEvent.steps = [];

      // Commit the transaction
      await client.query('COMMIT');
      console.log('✅ Transaction committed - Text-only event created successfully:', {
        id: newEvent.id,
        status: newEvent.status,
        slug: newEvent.slug
      });

    } catch (dbError) {
      // Rollback transaction on any error
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back - Event creation failed:', {
        error: dbError.message,
        code: dbError.code,
        constraint: dbError.constraint
      });
      throw dbError;
    } finally {
      // Always release the client
      client.release();
    }

    res.status(201).json({
      success: true,
      data: newEvent,
      message: req.t('api:events.createSuccess'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create text-only event error:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      userId: req.user?.id
    });

    // Enhanced error handling with comprehensive constraint violations
    let errorMessage = req.t('api:events.createFailed');
    let statusCode = 500;

    // Handle specific database constraint violations
    if (error.code === '23505') { // unique_violation
      if (error.constraint === 'events_slug_key') {
        errorMessage = 'A guide with this name already exists. Please choose a different name.';
        statusCode = 409;
      } else {
        errorMessage = 'This guide conflicts with an existing guide. Please try different details.';
        statusCode = 409;
      }
    } else if (error.code === '23514') { // check_violation  
      if (error.constraint === 'valid_expiration') {
        errorMessage = 'Invalid expiration date. Expiration must be in the future.';
        statusCode = 400;
      } else if (error.constraint === 'metadata_schema') {
        errorMessage = 'Invalid guide details format. Please check your description and location.';
        statusCode = 400;
      } else if (error.constraint === 'clicks_non_negative') {
        errorMessage = 'Invalid click count data.';
        statusCode = 400;
      } else {
        errorMessage = 'Guide details do not meet requirements. Please check all fields.';
        statusCode = 400;
      }
    } else if (error.code === '23503') { // foreign_key_violation
      errorMessage = 'Invalid user account. Please log in again.';
      statusCode = 401;
    } else if (error.code === '25001') { // serialization_failure
      errorMessage = 'Database conflict occurred. Please try again.';
      statusCode = 503;
    } else if (error.code === '57014') { // statement_timeout
      errorMessage = 'Guide creation took too long. Please try again with simpler details.';
      statusCode = 408;
    } else if (error.code === '08006') { // connection_failure
      errorMessage = 'Database connection error. Please try again.';
      statusCode = 503;
    } else if (error.message && error.message.includes('Event creation failed')) {
      errorMessage = error.message;
      statusCode = 500;
    } else if (error.message && error.message.includes('Invalid')) {
      errorMessage = error.message;
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error_code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      request_id: req.id || 'unknown'
    });
  }
});

/*
 * DEPRECATED ENDPOINT: Single-phase POST /api/v1/events
 * 
 * This endpoint has been removed in favor of the unified two-phase approach:
 * 1. POST /api/v1/events/text-only (create event with text data)
 * 2. PUT /api/v1/events/:id/cover-image (upload cover image separately)
 *
 * This ensures consistent behavior between draft and published guides.
 */
//   try {
//     // Validate form data (multipart form fields)
//     const { event_name, description, location, status, expiration_date } = req.body;
    
//     // Manual validation for required fields since express-validator doesn't work well with multipart
//     if (!event_name || event_name.trim().length === 0) {
//       // Clean up uploaded file if validation fails
//       if (req.file) {
//         deleteUploadedFile(req.file.filename);
//       }
//       return res.status(400).json({
//         success: false,
//         message: 'Event name is required',
//         errors: [{ path: 'event_name', msg: 'Event name is required' }]
//       });
//     }
// 
//     if (event_name.trim().length > 255) {
//       if (req.file) {
//         deleteUploadedFile(req.file.filename);
//       }
//       return res.status(400).json({
//         success: false,
//         message: 'Event name must be less than 255 characters',
//         errors: [{ path: 'event_name', msg: 'Event name must be less than 255 characters' }]
//       });
//     }
// 
//     if (description && description.length > 1000) {
//       if (req.file) {
//         deleteUploadedFile(req.file.filename);
//       }
//       return res.status(400).json({
//         success: false,
//         message: 'Description must be less than 1000 characters',
//         errors: [{ path: 'description', msg: 'Description must be less than 1000 characters' }]
//       });
//     }
// 
//     if (location && location.length > 255) {
//       if (req.file) {
//         deleteUploadedFile(req.file.filename);
//       }
//       return res.status(400).json({
//         success: false,
//         message: 'Location must be less than 255 characters',
//         errors: [{ path: 'location', msg: 'Location must be less than 255 characters' }]
//       });
//     }
// 
//     // Validate status if provided
//     if (status && !['draft', 'published'].includes(status)) {
//       if (req.file) {
//         deleteUploadedFile(req.file.filename);
//       }
//       return res.status(400).json({
//         success: false,
//         message: 'Status must be either "draft" or "published"',
//         errors: [{ path: 'status', msg: 'Invalid status value' }]
//       });
//     }
// 
//     const trimmedEventName = event_name.trim();
//     const slug = generateSlug(trimmedEventName);
//     
//     // Set default expiration if not provided (7 days from now)
//     let defaultExpirationDate = expiration_date;
//     if (!defaultExpirationDate) {
//       defaultExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
//     } else {
//       // Validate expiration date format if provided
//       const expDate = new Date(defaultExpirationDate);
//       if (isNaN(expDate.getTime())) {
//         if (req.file) {
//           deleteUploadedFile(req.file.filename);
//         }
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid expiration date format',
//           errors: [{ path: 'expiration_date', msg: 'Invalid date format' }]
//         });
//       }
//       defaultExpirationDate = expDate;
//     }
// 
//     // Build metadata object
//     const metadata = {};
//     if (description) metadata.description = description.trim();
//     if (location) metadata.location = location.trim();
//     if (req.file) {
//       metadata.cover_image = req.file.filename;
//       metadata.cover_image_original = req.file.originalname;
//     }

//     try {
//       const result = await query(`
//         INSERT INTO events (organizer_id, event_name, slug, metadata, expiration_date, status)
//         VALUES ($1, $2, $3, $4, $5, $6)
//         RETURNING 
//           id,
//           event_name,
//           slug,
//           status,
//           expiration_date,
//           clicks_count,
//           unique_visitors_count,
//           completion_count,
//           metadata,
//           is_featured,
//           created_at,
//           updated_at
//       `, [req.user.id, trimmedEventName, slug, JSON.stringify(metadata), defaultExpirationDate, status || 'draft']);

//       const newEvent = result.rows[0];
//       newEvent.steps = [];

//       res.status(201).json({
//         success: true,
//         data: newEvent,
//         message: req.t('api:events.createSuccess'),
//         timestamp: new Date().toISOString()
//       });

//     } catch (dbError) {
//       // If database error occurs, clean up uploaded file
//       if (req.file) {
//         deleteUploadedFile(req.file.filename);
//       }
//       throw dbError;
//     }

//   } catch (error) {
//     console.error('Create event error:', error);
//     
//     // Clean up uploaded file on any error
//     if (req.file) {
//       deleteUploadedFile(req.file.filename);
//     }
//     
//     // Handle unique constraint violation for slug
//     if (error.code === '23505' && error.constraint === 'events_slug_key') {
//       return res.status(400).json({
//         success: false,
//         message: 'An event with this name already exists. Please choose a different name.'
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Failed to create event'
//     });
//   }
// });

// PUT /api/v1/events/:id/cover-image - Update event cover image
// PUT /api/v1/events/:id/cover-image - Upload cover image (unified with step image architecture)
console.log('🛠️ Registering cover image upload route: PUT /:id/cover-image');
router.put('/:id/cover-image', (req, res, next) => {
  console.log('🎯 Cover image route HIT:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    eventId: req.params.id,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    userAgent: req.headers['user-agent'],
    authorization: !!req.headers['authorization'],
    timestamp: new Date().toISOString()
  });
  next();
}, authenticateToken, [...uuidValidation, uploadSingleImage, handleUploadError], async (req, res) => {
  const { id } = req.params;
  console.log('🚀 Cover image upload started:', {
    eventId: id,
    userId: req.user?.id,
    hasFile: !!req.file,
    filename: req.file?.filename,
    originalName: req.file?.originalname,
    size: req.file?.size,
    mimetype: req.file?.mimetype,
    timestamp: new Date().toISOString()
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Cover image validation failed:', {
        eventId: id,
        errors: errors.array(),
        hasFile: !!req.file
      });
      
      // Clean up uploaded file if validation fails
      if (req.file) {
        console.log('🧹 Cleaning up uploaded file after validation failure:', req.file.filename);
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    if (!req.file) {
      console.error('❌ No image file provided for cover image upload:', { eventId: id });
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('✅ Cover image validation passed:', {
      eventId: id,
      filename: req.file.filename,
      size: `${Math.round(req.file.size / 1024)} KB`
    });

    console.log('📊 Getting database client for cover image upload...');
    const client = await getClient();
    try {
      console.log('🔄 Starting database transaction...');
      await client.query('BEGIN');

      // Check if event exists and user has access (unified with step image pattern)
      console.log('🔍 Checking event access for cover image upload:', {
        eventId: id,
        userId: req.user.id
      });
      
      const eventResult = await client.query(`
        SELECT id, event_name, cover_image_url as current_cover_image_url
        FROM events
        WHERE id = $1 AND organizer_id = $2
      `, [id, req.user.id]);

      if (eventResult.rows.length === 0) {
        console.error('❌ Event not found or access denied for cover image upload:', {
          eventId: id,
          userId: req.user.id,
          queryResult: eventResult.rowCount
        });
        
        await client.query('ROLLBACK');
        // Clean up uploaded file
        console.log('🧹 Cleaning up uploaded file after access denied:', req.file.filename);
        deleteUploadedFile(req.file.filename);
        return res.status(404).json({
          success: false,
          message: req.t('api:events.notFound')
        });
      }

      console.log('✅ Event access verified for cover image upload:', {
        eventId: id,
        eventName: eventResult.rows[0].event_name,
        hasExistingCoverImage: !!eventResult.rows[0].current_cover_image_url,
        existingCoverImageUrl: eventResult.rows[0].current_cover_image_url
      });

      const event = eventResult.rows[0];
      const imageUrl = `/api/v1/images/${req.file.filename}`;
      const imageAlt = `${event.event_name} cover image`;

      console.log('📝 Preparing cover image database update:', {
        eventId: id,
        imageUrl,
        imageAlt,
        filename: req.file.filename
      });

      // Update event with new cover image URL (identical to step image pattern)
      console.log('💾 Executing cover image database update...');
      
      // Use a more specific update query that doesn't trigger unnecessary validations
      // Only update the cover image fields, not other event data that might trigger constraints
      const updateResult = await client.query(`
        UPDATE events 
        SET 
          cover_image_url = $1, 
          cover_image_alt = $2,
          updated_at = NOW()
        WHERE id = $3 AND organizer_id = $4
        RETURNING 
          id,
          organizer_id,
          event_name,
          slug,
          status,
          expiration_date,
          clicks_count,
          unique_visitors_count,
          completion_count,
          metadata,
          cover_image_url,
          cover_image_alt,
          is_featured,
          created_at,
          updated_at
      `, [imageUrl, imageAlt, id, req.user.id]);

      console.log('✅ Cover image database update successful:', {
        eventId: id,
        rowsUpdated: updateResult.rowCount,
        newCoverImageUrl: updateResult.rows[0]?.cover_image_url,
        newCoverImageAlt: updateResult.rows[0]?.cover_image_alt
      });

      // Verify the update was successful
      if (updateResult.rowCount === 0) {
        console.error('❌ No rows updated during cover image upload - possible access issue:', {
          eventId: id,
          userId: req.user.id
        });
        throw new Error('Event not found or access denied during image update');
      }

      if (!updateResult.rows[0]) {
        console.error('❌ No data returned from cover image update:', {
          eventId: id,
          rowsUpdated: updateResult.rowCount
        });
        throw new Error('Failed to retrieve updated event data');
      }

      console.log('💾 Committing cover image transaction...');
      await client.query('COMMIT');

      // Clean up old image if it exists (handle both old and new URL patterns)
      if (event.current_cover_image_url) {
        console.log('🧹 Cleaning up old cover image:', {
          eventId: id,
          oldCoverImageUrl: event.current_cover_image_url
        });
        
        let oldFilename = null;
        if (event.current_cover_image_url.startsWith('/api/v1/uploads/')) {
          oldFilename = event.current_cover_image_url.replace('/api/v1/uploads/', '');
        } else if (event.current_cover_image_url.startsWith('/api/v1/images/')) {
          oldFilename = event.current_cover_image_url.replace('/api/v1/images/', '');
        }
        
        if (oldFilename) {
          console.log('🧹 Deleting old cover image file:', oldFilename);
          deleteUploadedFile(oldFilename);
        } else {
          console.log('⚠️ Could not extract filename from old cover image URL:', event.current_cover_image_url);
        }
      } else {
        console.log('ℹ️ No existing cover image to clean up');
      }

      console.log('🎉 Cover image upload completed successfully:', {
        eventId: id,
        imageUrl: updateResult.rows[0].cover_image_url,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: updateResult.rows[0],
        message: 'Cover image uploaded successfully'
      });

    } catch (dbError) {
      console.error('❌ Database error during cover image upload:', {
        eventId: id,
        error: {
          message: dbError.message,
          code: dbError.code,
          name: dbError.name,
          constraint: dbError.constraint,
          detail: dbError.detail,
          hint: dbError.hint,
          position: dbError.position,
          stack: dbError.stack
        },
        filename: req.file?.filename
      });
      
      console.log('🔙 Rolling back database transaction...');
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      console.log('🔄 Releasing database client...');
      client.release();
    }

  } catch (error) {
    console.error('❌ Complete cover image upload error:', {
      eventId: id,
      userId: req.user?.id,
      filename: req.file?.filename,
      originalName: req.file?.originalname,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
    
    // Clean up uploaded file on error
    if (req.file) {
      console.log('🧹 Cleaning up uploaded file after error:', req.file.filename);
      deleteUploadedFile(req.file.filename);
    }

    // Determine appropriate error response based on error type
    let statusCode = 500;
    let errorMessage = 'Failed to upload cover image';
    let errorCode = 'UPLOAD_FAILED';

    if (error.code === '23505') {
      // Unique constraint violation
      statusCode = 409;
      errorMessage = 'Cover image conflict detected';
      errorCode = 'CONFLICT';
    } else if (error.code === '23503') {
      // Foreign key constraint violation
      statusCode = 400;
      errorMessage = 'Invalid event reference';
      errorCode = 'INVALID_REFERENCE';
    } else if (error.code === '23502') {
      // Not null violation
      statusCode = 400;
      errorMessage = 'Missing required data';
      errorCode = 'MISSING_DATA';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Validation error: ' + error.message;
      errorCode = 'VALIDATION_ERROR';
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: error.message,
        code: error.code,
        constraint: error.constraint
      } : undefined
    });
  }
});

// PUT /api/v1/events/:id - Update event
router.put('/:id', authenticateToken, [...uuidValidation, ...eventUpdateValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if event exists and belongs to user
    const existingEventResult = await query(
      'SELECT id, status FROM events WHERE id = $1 AND organizer_id = $2',
      [id, req.user.id]
    );

    if (existingEventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: req.t('api:events.notFound')
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (updates.event_name !== undefined) {
      updateFields.push(`event_name = $${paramCount}`);
      updateValues.push(updates.event_name);
      paramCount++;

      // Also update slug when event name changes
      updateFields.push(`slug = $${paramCount}`);
      updateValues.push(generateSlug(updates.event_name));
      paramCount++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(updates.status);
      paramCount++;
    }

    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount}`);
      updateValues.push(JSON.stringify(updates.metadata));
      paramCount++;
    }

    // Handle expiration logic based on status - SIMPLIFIED AND FIXED
    // Get current status or use provided status
    const currentStatus = updates.status !== undefined ? updates.status : existingEventResult.rows[0].status;
    
    // Handle expiration when status changes or when expiration fields are explicitly provided
    if (updates.status !== undefined || updates.expiration_date !== undefined || updates.expiration_hours !== undefined) {
      let expirationDate = null;
      
      // Only set expiration for published guides
      if (currentStatus === 'published') {
        if (updates.expiration_date) {
          // Use provided expiration date
          const expDate = new Date(updates.expiration_date);
          if (isNaN(expDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid expiration date format',
              errors: [{ path: 'expiration_date', msg: 'Invalid date format' }]
            });
          }
          
          // Validate expiration date is reasonable (allow past dates for flexibility)
          const now = new Date();
          const maxExpiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Extended to 7 days for flexibility
          if (expDate > maxExpiration) {
            console.warn(`Expiration date is very far in future: ${expDate}`);
          }
          expirationDate = expDate;
        } else if (updates.expiration_hours !== undefined) {
          // Use custom hours (1-168 hour range, extended for flexibility)
          const hours = Math.max(1, Math.min(168, updates.expiration_hours)); // Allow up to 7 days
          expirationDate = new Date(Date.now() + hours * 60 * 60 * 1000);
        } else {
          // Default to 24 hours for published guides when no expiration is specified
          expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
      }
      // For draft status, expirationDate remains null (will clear existing expiration)
      
      updateFields.push(`expiration_date = $${paramCount}`);
      updateValues.push(expirationDate);
      paramCount++;
      
      console.log(`Status update: ${currentStatus}, Expiration set to: ${expirationDate}`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id, req.user.id);

    const updateQuery = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND organizer_id = $${paramCount + 1}
      RETURNING 
        id,
        event_name,
        slug,
        status,
        expiration_date,
        clicks_count,
        unique_visitors_count,
        completion_count,
        metadata,
        is_featured,
        created_at,
        updated_at
    `;

    const result = await query(updateQuery, updateValues);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Event updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update event error:', error);
    
    if (error.code === '23505' && error.constraint === 'events_slug_key') {
      return res.status(400).json({
        success: false,
        message: 'An event with this name already exists. Please choose a different name.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
});

// DELETE /api/v1/events/:id - Delete event and all associated steps
router.delete('/:id', authenticateToken, uuidValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('DELETE validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id } = req.params;
    console.log(`🗑️ DELETE request for event: ${id} by user: ${req.user.id}`);

    const client = await getClient();
    try {
      await client.query('BEGIN');
      console.log(`📊 Transaction started for deletion of event: ${id}`);

      // Check if event exists and belongs to user
      const eventResult = await client.query(
        'SELECT id, event_name, status, organizer_id FROM events WHERE id = $1 AND organizer_id = $2',
        [id, req.user.id]
      );

      if (eventResult.rows.length === 0) {
        console.warn(`❌ Event not found or access denied: ${id} for user: ${req.user.id}`);
        
        // Also check if event exists at all (for debugging ownership issues)
        const anyEventResult = await client.query('SELECT id, organizer_id FROM events WHERE id = $1', [id]);
        if (anyEventResult.rows.length > 0) {
          console.error(`🚨 Event exists but belongs to different user: ${id} (owner: ${anyEventResult.rows[0].organizer_id}, requester: ${req.user.id})`);
        } else {
          console.warn(`🔍 Event does not exist in database: ${id}`);
        }
        
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: req.t('api:events.notFound')
        });
      }

      const eventData = eventResult.rows[0];
      console.log(`✅ Event found for deletion:`, {
        id: eventData.id,
        name: eventData.event_name,
        status: eventData.status,
        owner: eventData.organizer_id
      });

      // Get steps count before deletion (for logging)
      const stepsResult = await client.query('SELECT COUNT(*) as step_count FROM steps WHERE event_id = $1', [id]);
      const stepCount = parseInt(stepsResult.rows[0].step_count);
      console.log(`📋 Event has ${stepCount} steps to be deleted via CASCADE`);

      // Delete event (steps will be deleted automatically due to CASCADE)
      const deleteResult = await client.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
      
      if (deleteResult.rowCount === 0) {
        console.error(`❌ DELETE operation affected 0 rows for event: ${id}`);
        await client.query('ROLLBACK');
        return res.status(500).json({
          success: false,
          message: 'Failed to delete event - no rows affected'
        });
      }

      console.log(`🗑️ Successfully deleted event: ${id} (${deleteResult.rowCount} row affected)`);

      // Verify steps were deleted by CASCADE
      const remainingStepsResult = await client.query('SELECT COUNT(*) as remaining_count FROM steps WHERE event_id = $1', [id]);
      const remainingSteps = parseInt(remainingStepsResult.rows[0].remaining_count);
      
      if (remainingSteps > 0) {
        console.warn(`⚠️ CASCADE deletion may have failed - ${remainingSteps} steps still exist for deleted event: ${id}`);
      } else {
        console.log(`✅ CASCADE deletion successful - all ${stepCount} steps deleted`);
      }

      await client.query('COMMIT');
      console.log(`✅ Transaction committed successfully for event deletion: ${id}`);

      res.status(200).json({
        success: true,
        data: { 
          deletedEventId: id,
          eventName: eventData.event_name,
          deletedStepsCount: stepCount
        },
        message: 'Event and all associated steps deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error(`🔥 Database error during deletion:`, {
        eventId: id,
        userId: req.user.id,
        error: dbError.message,
        code: dbError.code,
        constraint: dbError.constraint,
        stack: dbError.stack
      });
      throw dbError;
    } finally {
      client.release();
      console.log(`🔐 Database connection released for event deletion: ${id}`);
    }

  } catch (error) {
    console.error(`💥 DELETE event error:`, {
      eventId: id,
      userId: req.user?.id,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/v1/events/:id/steps - Add step to event (RESTful endpoint)
router.post('/:id/steps', authenticateToken, [...uuidValidation, ...stepValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id: eventId } = req.params;
    const { step_order, description, image_url = null, image_alt = null, metadata = {} } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify event exists and belongs to user
      const eventResult = await client.query(
        'SELECT id, event_name, status FROM events WHERE id = $1 AND organizer_id = $2',
        [eventId, req.user.id]
      );

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: req.t('api:events.notFound')
        });
      }

      // Check if step order already exists and shift if necessary
      const existingStepResult = await client.query(
        'SELECT id FROM steps WHERE event_id = $1 AND step_order = $2',
        [eventId, step_order]
      );

      if (existingStepResult.rows.length > 0) {
        // Shift existing steps with order >= step_order
        await client.query(`
          UPDATE steps 
          SET step_order = step_order + 1, updated_at = NOW()
          WHERE event_id = $1 AND step_order >= $2
        `, [eventId, step_order]);
      }

      // Insert new step
      const stepResult = await client.query(`
        INSERT INTO steps (event_id, step_order, description, image_url, image_alt, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id,
          event_id,
          step_order,
          image_url,
          image_alt,
          description,
          view_count,
          completion_count,
          metadata,
          created_at,
          updated_at
      `, [eventId, step_order, description, image_url, image_alt, JSON.stringify(metadata)]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: stepResult.rows[0],
        message: 'Step created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create step error:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'A step with this order already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create step'
    });
  }
});

// =============================================================================
// ANALYTICS ENDPOINTS
// =============================================================================

// GET /api/v1/events/analytics/summary - Get analytics summary for organizer
router.get('/analytics/summary', [
  authenticateToken,
  expressQuery('days').optional().isInt({ min: 1, max: 365 }).toInt().withMessage('Days must be between 1 and 365'),
  expressQuery('include_deleted').optional().isBoolean().toBoolean().withMessage('Include deleted must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { days = 30, include_deleted = false } = req.query;
    const organizerId = req.user.id;

    const client = await getClient();
    try {
      // Use the database function to get comprehensive organizer analytics
      const result = await client.query(`
        SELECT * FROM get_organizer_analytics_summary($1, $2, $3)
      `, [organizerId, days, include_deleted]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No analytics data found'
        });
      }

      const analyticsData = result.rows[0];

      res.status(200).json({
        success: true,
        data: {
          summary: {
            total_guides: parseInt(analyticsData.total_guides) || 0,
            active_guides: parseInt(analyticsData.active_guides) || 0,
            draft_guides: parseInt(analyticsData.draft_guides) || 0,
            deleted_guides: parseInt(analyticsData.deleted_guides) || 0,
            total_views: parseInt(analyticsData.total_views) || 0,
            unique_visitors: parseInt(analyticsData.unique_visitors) || 0,
            total_completions: parseInt(analyticsData.total_completions) || 0,
            avg_completion_rate: parseFloat(analyticsData.avg_completion_rate) || 0,
            total_feedback: parseInt(analyticsData.total_feedback) || 0,
            avg_like_rate: parseFloat(analyticsData.avg_like_rate) || 0,
            avg_helpful_rate: parseFloat(analyticsData.avg_helpful_rate) || 0,
            avg_creation_time_minutes: parseFloat(analyticsData.avg_creation_time_minutes) || 0
          },
          most_popular_guide: analyticsData.most_popular_guide || null,
          recent_feedback: analyticsData.recent_feedback || [],
          period_days: days,
          include_deleted
        },
        message: 'Analytics summary retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics summary'
    });
  }
});

// GET /api/v1/events/:id/analytics - Get detailed analytics for specific guide
router.get('/:id/analytics', [
  authenticateToken,
  param('id').isUUID().withMessage('Invalid event ID'),
  expressQuery('days').optional().isInt({ min: 1, max: 365 }).toInt().withMessage('Days must be between 1 and 365')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id: eventId } = req.params;
    const { days = 30 } = req.query;
    const organizerId = req.user.id;

    const client = await getClient();
    try {
      // Verify the event belongs to this organizer
      const eventResult = await client.query(`
        SELECT id, event_name, status, deleted_at 
        FROM events 
        WHERE id = $1 AND organizer_id = $2
      `, [eventId, organizerId]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: req.t('api:events.notFound')
        });
      }

      const event = eventResult.rows[0];

      // Get detailed analytics using the database function
      const analyticsResult = await client.query(`
        SELECT * FROM get_event_analytics_detailed($1, $2)
      `, [eventId, days]);

      if (analyticsResult.rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            event: {
              id: event.id,
              name: event.event_name,
              status: event.status,
              is_deleted: !!event.deleted_at
            },
            analytics: {
              total_views: 0,
              unique_visitors: 0,
              completion_count: 0,
              completion_rate: 0,
              avg_completion_time_seconds: 0,
              feedback_count: 0,
              like_rate: 0,
              helpful_rate: 0,
              returning_visitor_rate: 0,
              top_devices: {},
              top_countries: {},
              top_referrers: {}
            },
            period_days: days
          },
          message: 'Event analytics retrieved (no data available)',
          timestamp: new Date().toISOString()
        });
      }

      const analytics = analyticsResult.rows[0];

      // Get individual feedback entries for this event
      const feedbackResult = await client.query(`
        SELECT 
          id,
          liked,
          helpful,
          feedback_text,
          submitted_at,
          visitor_id
        FROM event_feedback 
        WHERE event_id = $1 
          AND submitted_at > NOW() - INTERVAL '1 day' * $2
        ORDER BY submitted_at DESC
        LIMIT 50
      `, [eventId, days]);

      res.status(200).json({
        success: true,
        data: {
          event: {
            id: event.id,
            name: event.event_name,
            status: event.status,
            is_deleted: !!event.deleted_at
          },
          analytics: {
            total_views: parseInt(analytics.total_views) || 0,
            unique_visitors: parseInt(analytics.unique_visitors) || 0,
            completion_count: parseInt(analytics.completion_count) || 0,
            completion_rate: parseFloat(analytics.completion_rate) || 0,
            avg_completion_time_seconds: parseFloat(analytics.avg_completion_time_seconds) || 0,
            feedback_count: parseInt(analytics.feedback_count) || 0,
            like_rate: parseFloat(analytics.like_rate) || 0,
            helpful_rate: parseFloat(analytics.helpful_rate) || 0,
            returning_visitor_rate: parseFloat(analytics.returning_visitor_rate) || 0,
            top_devices: analytics.top_devices || {},
            top_countries: analytics.top_countries || {},
            top_referrers: analytics.top_referrers || {}
          },
          feedback: feedbackResult.rows.map(feedback => ({
            id: feedback.id,
            liked: feedback.liked,
            helpful: feedback.helpful,
            feedback_text: feedback.feedback_text,
            submitted_at: feedback.submitted_at,
            visitor_id: feedback.visitor_id
          })),
          period_days: days
        },
        message: 'Event analytics retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event analytics'
    });
  }
});

// GET /api/v1/events/analytics/feedback/recent - Get recent feedback for organizer
router.get('/analytics/feedback/recent', [
  authenticateToken,
  expressQuery('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { limit = 20, days = 7 } = req.query;
    const organizerId = req.user.id;

    const client = await getClient();
    try {
      // Get recent feedback for all guides by this organizer
      const result = await client.query(`
        SELECT 
          f.id as feedback_id,
          f.liked,
          f.helpful,
          f.feedback_text,
          f.submitted_at,
          e.id as event_id,
          e.event_name,
          e.status as event_status
        FROM event_feedback f
        JOIN events e ON f.event_id = e.id
        WHERE e.organizer_id = $1 
          AND f.submitted_at > NOW() - INTERVAL '1 day' * $2
          AND e.deleted_at IS NULL
        ORDER BY f.submitted_at DESC
        LIMIT $3
      `, [organizerId, days, limit]);

      res.status(200).json({
        success: true,
        data: {
          feedback: result.rows.map(feedback => ({
            id: feedback.feedback_id,
            liked: feedback.liked,
            helpful: feedback.helpful,
            feedback_text: feedback.feedback_text,
            submitted_at: feedback.submitted_at,
            event: {
              id: feedback.event_id,
              name: feedback.event_name,
              status: feedback.event_status
            }
          })),
          total_count: result.rows.length,
          period_days: days,
          limit
        },
        message: 'Recent feedback retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get recent feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent feedback'
    });
  }
});

// Debug route registration
console.log('📋 Events routes registered:');
router.stack.forEach((layer, index) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
    console.log(`${index + 1}. ${methods} ${layer.route.path}`);
  }
});

module.exports = router;