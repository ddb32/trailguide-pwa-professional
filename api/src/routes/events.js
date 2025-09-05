const express = require('express');
const { body, param, query: expressQuery, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingleImage, handleUploadError, deleteUploadedFile } = require('../middleware/upload');

const router = express.Router();

// Validation schemas
const eventValidation = [
  body('event_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Event name must be between 1 and 255 characters'),
  body('metadata.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('metadata.location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('expiration_date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Expiration date must be a valid ISO 8601 date')
];

const eventUpdateValidation = [
  body('event_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Event name must be between 1 and 255 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'expired', 'archived'])
    .withMessage('Invalid status'),
  body('metadata.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('expiration_date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Expiration date must be a valid ISO 8601 date')
];

const uuidValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid event ID format')
];

// Helper function to generate slug from event name
function generateSlug(eventName) {
  return eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
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
        message: 'Validation failed',
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
      message: 'Events retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events'
    });
  }
});

// GET /api/v1/events/:id - Get single event with steps
router.get('/:id', authenticateToken, uuidValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Get event details
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
        is_featured,
        created_at,
        updated_at
      FROM events
      WHERE id = $1 AND organizer_id = $2
    `, [id, req.user.id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied'
      });
    }

    const event = eventResult.rows[0];

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

    event.steps = stepsResult.rows;

    res.status(200).json({
      success: true,
      data: event,
      message: 'Event retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event'
    });
  }
});

// POST /api/v1/events - Create new event with optional image upload
router.post('/', authenticateToken, uploadSingleImage, handleUploadError, async (req, res) => {
  try {
    // Validate form data (multipart form fields)
    const { event_name, description, location, status, expiration_date } = req.body;
    
    // Manual validation for required fields since express-validator doesn't work well with multipart
    if (!event_name || event_name.trim().length === 0) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Event name is required',
        errors: [{ path: 'event_name', msg: 'Event name is required' }]
      });
    }

    if (event_name.trim().length > 255) {
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Event name must be less than 255 characters',
        errors: [{ path: 'event_name', msg: 'Event name must be less than 255 characters' }]
      });
    }

    if (description && description.length > 1000) {
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Description must be less than 1000 characters',
        errors: [{ path: 'description', msg: 'Description must be less than 1000 characters' }]
      });
    }

    if (location && location.length > 255) {
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Location must be less than 255 characters',
        errors: [{ path: 'location', msg: 'Location must be less than 255 characters' }]
      });
    }

    // Validate status if provided
    if (status && !['draft', 'published'].includes(status)) {
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Status must be either "draft" or "published"',
        errors: [{ path: 'status', msg: 'Invalid status value' }]
      });
    }

    const trimmedEventName = event_name.trim();
    const slug = generateSlug(trimmedEventName);
    
    // Set default expiration if not provided (7 days from now)
    let defaultExpirationDate = expiration_date;
    if (!defaultExpirationDate) {
      defaultExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      // Validate expiration date format if provided
      const expDate = new Date(defaultExpirationDate);
      if (isNaN(expDate.getTime())) {
        if (req.file) {
          deleteUploadedFile(req.file.filename);
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid expiration date format',
          errors: [{ path: 'expiration_date', msg: 'Invalid date format' }]
        });
      }
      defaultExpirationDate = expDate;
    }

    // Build metadata object
    const metadata = {};
    if (description) metadata.description = description.trim();
    if (location) metadata.location = location.trim();
    if (req.file) {
      metadata.cover_image = req.file.filename;
      metadata.cover_image_original = req.file.originalname;
    }

    try {
      const result = await query(`
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
      `, [req.user.id, trimmedEventName, slug, JSON.stringify(metadata), defaultExpirationDate, status || 'draft']);

      const newEvent = result.rows[0];
      newEvent.steps = [];

      res.status(201).json({
        success: true,
        data: newEvent,
        message: 'Event created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      // If database error occurs, clean up uploaded file
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      throw dbError;
    }

  } catch (error) {
    console.error('Create event error:', error);
    
    // Clean up uploaded file on any error
    if (req.file) {
      deleteUploadedFile(req.file.filename);
    }
    
    // Handle unique constraint violation for slug
    if (error.code === '23505' && error.constraint === 'events_slug_key') {
      return res.status(400).json({
        success: false,
        message: 'An event with this name already exists. Please choose a different name.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create event'
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
        message: 'Validation failed',
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
        message: 'Event not found or access denied'
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

    if (updates.expiration_date !== undefined) {
      updateFields.push(`expiration_date = $${paramCount}`);
      updateValues.push(updates.expiration_date);
      paramCount++;
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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check if event exists and belongs to user
      const eventResult = await client.query(
        'SELECT id, event_name FROM events WHERE id = $1 AND organizer_id = $2',
        [id, req.user.id]
      );

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found or access denied'
        });
      }

      const eventName = eventResult.rows[0].event_name;

      // Delete event (steps will be deleted automatically due to CASCADE)
      await client.query('DELETE FROM events WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: { 
          deletedEventId: id,
          eventName: eventName
        },
        message: 'Event and all associated steps deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
});

module.exports = router;