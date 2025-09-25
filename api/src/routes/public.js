const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');

const router = express.Router();

const uuidValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid event ID format')
];

const slugValidation = [
  param('slug')
    .isLength({ min: 1, max: 200 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Invalid event slug format')
];

// Helper function to record analytics with duplicate prevention
async function recordEventView(client, eventId, req) {
  try {
    // Get enhanced visitor tracking data from headers
    const visitorId = req.headers['x-visitor-id'] || null;
    const sessionId = req.headers['x-session-id'] || null;
    const deviceType = req.headers['x-device-type'] || null;
    const browserInfo = req.headers['x-browser-info'] || null;
    const isReturning = req.headers['x-is-returning'] === 'true';

    console.log('📊 Enhanced analytics data received:', {
      visitorId: visitorId ? `${visitorId.substring(0, 8)}...` : 'null',
      sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'null',
      deviceType,
      browserInfo,
      isReturning,
      userAgent: req.get('User-Agent')?.substring(0, 50) + '...'
    });

    // **ENHANCED DUPLICATE PREVENTION**: Multi-layer session-based deduplication
    let duplicateFound = false;
    let existingView = null;

    // Layer 0: Ultra-strict rapid request deduplication (same session within 30 seconds)
    // This catches frontend double-loading issues like React Strict Mode
    if (sessionId) {
      const rapidCheck = await client.query(`
        SELECT id, viewed_at, 'rapid' as match_type
        FROM event_views
        WHERE event_id = $1
          AND session_id = $2
          AND viewed_at > NOW() - INTERVAL '30 seconds'
        ORDER BY viewed_at DESC
        LIMIT 1
      `, [eventId, sessionId]);

      if (rapidCheck.rows.length > 0) {
        duplicateFound = true;
        existingView = rapidCheck.rows[0];
      }
    }

    // Layer 1: Strict session-based deduplication (same session within 30 minutes)
    if (!duplicateFound && sessionId) {
      const sessionCheck = await client.query(`
        SELECT id, viewed_at, 'session' as match_type
        FROM event_views
        WHERE event_id = $1
          AND session_id = $2
          AND viewed_at > NOW() - INTERVAL '30 minutes'
        ORDER BY viewed_at DESC
        LIMIT 1
      `, [eventId, sessionId]);

      if (sessionCheck.rows.length > 0) {
        duplicateFound = true;
        existingView = sessionCheck.rows[0];
      }
    }

    // Layer 2: Visitor-based deduplication (same visitor within 10 minutes)
    if (!duplicateFound && visitorId) {
      const visitorCheck = await client.query(`
        SELECT id, viewed_at, 'visitor' as match_type
        FROM event_views
        WHERE event_id = $1
          AND visitor_id = $2
          AND viewed_at > NOW() - INTERVAL '10 minutes'
        ORDER BY viewed_at DESC
        LIMIT 1
      `, [eventId, visitorId]);

      if (visitorCheck.rows.length > 0) {
        duplicateFound = true;
        existingView = visitorCheck.rows[0];
      }
    }

    // Layer 3: IP-based deduplication (same IP within 2 minutes) - last resort
    if (!duplicateFound && req.ip && (!visitorId && !sessionId)) {
      const ipCheck = await client.query(`
        SELECT id, viewed_at, 'ip' as match_type
        FROM event_views
        WHERE event_id = $1
          AND ip_address = $2
          AND viewed_at > NOW() - INTERVAL '2 minutes'
          AND visitor_id IS NULL
          AND session_id IS NULL
        ORDER BY viewed_at DESC
        LIMIT 1
      `, [eventId, req.ip]);

      if (ipCheck.rows.length > 0) {
        duplicateFound = true;
        existingView = ipCheck.rows[0];
      }
    }

    if (duplicateFound && existingView) {
      const timeSinceLastView = Math.round((Date.now() - new Date(existingView.viewed_at).getTime()) / 1000);
      console.log('🛑 Duplicate view detected - skipping count increment:', {
        eventId,
        existingViewId: existingView.id,
        existingViewTime: existingView.viewed_at,
        matchType: existingView.match_type,
        visitorId: visitorId?.substring(0, 8) + '...',
        sessionId: sessionId?.substring(0, 8) + '...',
        ipAddress: req.ip?.substring(0, 8) + '...',
        timeSinceLastView: timeSinceLastView + 's'
      });

      // Return existing view instead of creating duplicate
      return {
        id: existingView.id,
        viewed_at: existingView.viewed_at,
        isDuplicate: true,
        matchType: existingView.match_type
      };
    }

    // Record new event view if no duplicate found
    const result = await client.query(`
      INSERT INTO event_views (
        event_id, visitor_id, session_id, ip_address, user_agent, referrer,
        device_type, browser_info, is_returning_visitor
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, viewed_at
    `, [
      eventId,
      visitorId,
      sessionId,
      req.ip,
      req.get('User-Agent') || null,
      req.get('Referrer') || null,
      deviceType,
      browserInfo,
      isReturning
    ]);

    // Update unique visitors count (clicks_count is automatically handled by database trigger)
    await client.query(`
      UPDATE events
      SET unique_visitors_count = (
            SELECT COUNT(DISTINCT visitor_id)
            FROM event_views
            WHERE event_id = $1 AND visitor_id IS NOT NULL
          )
      WHERE id = $1
    `, [eventId]);

    console.log('✅ New analytics view recorded:', {
      eventId,
      viewId: result.rows[0].id,
      hasVisitorId: !!visitorId,
      hasSessionId: !!sessionId,
      deviceType,
      isReturning,
      ipAddress: req.ip?.substring(0, 8) + '...'
    });

    return {
      id: result.rows[0].id,
      viewed_at: result.rows[0].viewed_at,
      isDuplicate: false
    };
  } catch (error) {
    console.error('Analytics recording error:', error);
    // Don't fail the request if analytics fail
    return null;
  }
}

// Helper function to record expired access attempts
async function recordExpiredAccess(client, eventInfo, req, accessMethod = 'slug') {
  try {
    const visitorId = req.headers['x-visitor-id'] || null;
    const sessionId = req.headers['x-session-id'] || null;
    const deviceType = req.headers['x-device-type'] || null;
    const browserInfo = req.headers['x-browser-info'] || null;
    const isReturning = req.headers['x-is-returning'] === 'true';

    // Check if table exists and use basic logging for now
    await client.query(`
      INSERT INTO expired_access_attempts (
        event_id, event_slug, event_name, visitor_id, ip_address,
        user_agent, referrer, access_method, expired_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      eventInfo.id,
      eventInfo.slug,
      eventInfo.event_name,
      visitorId,
      req.ip,
      req.get('User-Agent') || null,
      req.get('Referrer') || null,
      accessMethod,
      eventInfo.expiration_date
    ]);

    console.log(`🔒 Expired access attempt logged - Event: ${eventInfo.event_name}, Method: ${accessMethod}, Visitor: ${visitorId?.substring(0, 8)}..., Device: ${deviceType}`);
  } catch (error) {
    console.error('Expired access logging error:', error);
    // Don't fail the request if logging fails
  }
}

async function recordStepView(client, stepId, eventViewId, stepOrder) {
  try {
    await client.query(`
      INSERT INTO step_views (step_id, event_view_id, step_order, viewed_at)
      VALUES ($1, $2, $3, NOW())
    `, [stepId, eventViewId, stepOrder]);

    // Increment view count on step
    await client.query(`
      UPDATE steps SET view_count = view_count + 1 WHERE id = $1
    `, [stepId]);
  } catch (error) {
    console.error('Step analytics recording error:', error);
  }
}

// GET /api/v1/public/events/:id - Get public event by ID
router.get('/events/:id', uuidValidation, async (req, res) => {
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

      // Get event details - check both active and expired published events
      const eventResult = await client.query(`
        SELECT 
          id,
          event_name,
          slug,
          status,
          expiration_date,
          metadata,
          cover_image_url,
          cover_image_alt,
          created_at,
          CASE 
            WHEN expiration_date IS NOT NULL AND expiration_date <= NOW() THEN true 
            ELSE false 
          END as is_expired
        FROM events
        WHERE id = $1 AND status = 'published'
      `, [id]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found or not published',
          error_type: 'not_found'
        });
      }

      const event = eventResult.rows[0];
      
      // If expired, log the attempt and return expired error
      if (event.is_expired) {
        await recordExpiredAccess(client, event, req, 'id');
        await client.query('ROLLBACK');
        return res.status(410).json({
          success: false,
          message: 'This guide has expired and is no longer accessible',
          error_type: 'expired',
          expired_at: event.expiration_date,
          event_name: event.event_name
        });
      }

      // Get steps for this event
      const stepsResult = await client.query(`
        SELECT 
          id,
          step_order,
          image_url,
          image_alt,
          description,
          metadata
        FROM steps
        WHERE event_id = $1
        ORDER BY step_order ASC
      `, [id]);

      event.steps = stepsResult.rows;

      // Record analytics for the view
      const eventView = await recordEventView(client, id, req);
      
      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          event,
          analytics: {
            viewId: eventView?.id,
            viewedAt: eventView?.viewed_at
          }
        },
        message: 'Event retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get public event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event'
    });
  }
});

// GET /api/v1/public/events/slug/:slug - Get public event by slug
router.get('/events/slug/:slug', slugValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { slug } = req.params;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Get event details by slug - check both active and expired published events
      const eventResult = await client.query(`
        SELECT 
          id,
          event_name,
          slug,
          status,
          expiration_date,
          metadata,
          cover_image_url,
          cover_image_alt,
          created_at,
          CASE 
            WHEN expiration_date IS NOT NULL AND expiration_date <= NOW() THEN true 
            ELSE false 
          END as is_expired
        FROM events
        WHERE slug = $1 AND status = 'published'
      `, [slug]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found or not published',
          error_type: 'not_found'
        });
      }

      const event = eventResult.rows[0];
      
      // If expired, log the attempt and return expired error
      if (event.is_expired) {
        await recordExpiredAccess(client, event, req, 'slug');
        await client.query('ROLLBACK');
        return res.status(410).json({
          success: false,
          message: 'This guide has expired and is no longer accessible',
          error_type: 'expired',
          expired_at: event.expiration_date,
          event_name: event.event_name
        });
      }

      // Get steps for this event
      const stepsResult = await client.query(`
        SELECT 
          id,
          step_order,
          image_url,
          image_alt,
          description,
          metadata
        FROM steps
        WHERE event_id = $1
        ORDER BY step_order ASC
      `, [event.id]);

      event.steps = stepsResult.rows;

      // Record analytics for the view
      const eventView = await recordEventView(client, event.id, req);
      
      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          event,
          analytics: {
            viewId: eventView?.id,
            viewedAt: eventView?.viewed_at
          }
        },
        message: 'Event retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get public event by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event'
    });
  }
});

// POST /api/v1/public/events/:id/steps/:stepId/view - Record step view for analytics
router.post('/events/:id/steps/:stepId/view', [
  param('id').isUUID().withMessage('Invalid event ID'),
  param('stepId').isUUID().withMessage('Invalid step ID')
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

    const { id: eventId, stepId } = req.params;
    const { viewId, timeSpent } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify event exists and is published
      const eventResult = await client.query(`
        SELECT id FROM events
        WHERE id = $1 AND status = 'published'
      `, [eventId]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found or not published'
        });
      }

      // Verify step belongs to event
      const stepResult = await client.query(`
        SELECT step_order FROM steps
        WHERE id = $1 AND event_id = $2
      `, [stepId, eventId]);

      if (stepResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Step not found or does not belong to event'
        });
      }

      const stepOrder = stepResult.rows[0].step_order;

      // Record step view
      await client.query(`
        INSERT INTO step_views (step_id, event_view_id, step_order, time_spent_seconds)
        VALUES ($1, $2, $3, $4)
      `, [stepId, viewId, stepOrder, timeSpent || null]);

      // Update step view count
      await client.query(`
        UPDATE steps SET view_count = view_count + 1 WHERE id = $1
      `, [stepId]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Step view recorded successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Record step view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record step view'
    });
  }
});

// POST /api/v1/public/events/:id/complete - Mark event as completed
router.post('/events/:id/complete', uuidValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: eventId } = req.params;
    const { viewId, completionTimeSeconds } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Update event view as completed
      const updateResult = await client.query(`
        UPDATE event_views 
        SET completed = true, 
            completed_at = NOW(),
            completion_time_seconds = $1
        WHERE id = $2 AND event_id = $3
        RETURNING id
      `, [completionTimeSeconds || null, viewId, eventId]);

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event view not found'
        });
      }

      // Update event completion count
      await client.query(`
        UPDATE events 
        SET completion_count = completion_count + 1 
        WHERE id = $1
      `, [eventId]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Event completion recorded successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Record event completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record event completion'
    });
  }
});

// POST /api/v1/public/events/:id/feedback - Submit feedback for completed guide (guide or founder type)
router.post('/events/:id/feedback', [
  param('id').isUUID().withMessage('Invalid event ID'),
  body('viewId').isUUID().withMessage('Valid event view ID is required'),
  body('feedback_type').isIn(['guide', 'founder']).withMessage('Feedback type must be guide or founder'),
  // Guide feedback fields
  body('liked').optional().isBoolean().withMessage('Liked must be boolean'),
  body('helpful').optional().isBoolean().withMessage('Helpful must be boolean'),
  // Founder feedback fields
  body('overall_rating').optional().isIn(['excellent', 'good', 'poor']).withMessage('Overall rating must be excellent, good, or poor'),
  body('concept_rating').optional().isIn(['excellent', 'good', 'poor']).withMessage('Concept rating must be excellent, good, or poor'),
  body('presentation_rating').optional().isIn(['excellent', 'good', 'poor']).withMessage('Presentation rating must be excellent, good, or poor'),
  body('recommend_rating').optional().isIn(['yes', 'no']).withMessage('Recommend rating must be yes or no'),
  body('feedback_text').optional().isLength({ max: 1000 }).withMessage('Feedback text too long (max 1000 characters)')
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

    const { id: eventId } = req.params;
    const { 
      viewId, 
      feedback_type,
      // Guide feedback fields
      liked, 
      helpful, 
      // Founder feedback fields
      overall_rating,
      concept_rating,
      presentation_rating,
      recommend_rating,
      // Common field
      feedback_text 
    } = req.body;

    // Validate feedback content based on type
    if (feedback_type === 'guide') {
      if (liked === undefined && helpful === undefined && !feedback_text) {
        return res.status(400).json({
          success: false,
          message: 'Guide feedback must include at least one rating (liked, helpful) or text comment'
        });
      }
    } else if (feedback_type === 'founder') {
      if (!overall_rating && !concept_rating && !presentation_rating && !recommend_rating && !feedback_text) {
        return res.status(400).json({
          success: false,
          message: 'Founder feedback must include at least one rating or text comment'
        });
      }
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify the event exists and is published
      const eventResult = await client.query(`
        SELECT id, event_name, status, deleted_at
        FROM events
        WHERE id = $1 AND status = 'published' AND deleted_at IS NULL
      `, [eventId]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found or not published'
        });
      }

      // Verify the event view exists and belongs to this event
      const viewResult = await client.query(`
        SELECT event_id, visitor_id, ip_address, user_agent, completed
        FROM event_views
        WHERE id = $1 AND event_id = $2
      `, [viewId, eventId]);

      if (viewResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event view not found or does not match event'
        });
      }

      const eventView = viewResult.rows[0];

      // Check if feedback already exists for this event view
      const existingFeedbackResult = await client.query(`
        SELECT id FROM event_feedback WHERE event_view_id = $1
      `, [viewId]);

      if (existingFeedbackResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Feedback already submitted for this guide session'
        });
      }

      // Insert the feedback
      const feedbackResult = await client.query(`
        INSERT INTO event_feedback (
          event_view_id, event_id, feedback_type, liked, helpful, feedback_text,
          overall_rating, concept_rating, presentation_rating, recommend_rating,
          visitor_id, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, submitted_at
      `, [
        viewId,
        eventId,
        feedback_type,
        liked !== undefined ? liked : null,
        helpful !== undefined ? helpful : null,
        feedback_text || null,
        overall_rating || null,
        concept_rating || null,
        presentation_rating || null,
        recommend_rating || null,
        eventView.visitor_id,
        eventView.ip_address,
        eventView.user_agent
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          feedbackId: feedbackResult.rows[0].id,
          submittedAt: feedbackResult.rows[0].submitted_at
        },
        message: 'Feedback submitted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// GET /api/v1/public/health - Public health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Public API is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;