const express = require('express');
const { param, validationResult } = require('express-validator');
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

// Helper function to record analytics
async function recordEventView(client, eventId, req) {
  try {
    // Generate or get visitor ID from session/cookies (simplified for MVP)
    const visitorId = req.headers['x-visitor-id'] || null;
    
    const result = await client.query(`
      INSERT INTO event_views (event_id, visitor_id, ip_address, user_agent, referrer)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, viewed_at
    `, [
      eventId,
      visitorId,
      req.ip,
      req.get('User-Agent') || null,
      req.get('Referrer') || null
    ]);

    // Increment clicks count on event
    await client.query(`
      UPDATE events 
      SET clicks_count = clicks_count + 1,
          unique_visitors_count = (
            SELECT COUNT(DISTINCT visitor_id) 
            FROM event_views 
            WHERE event_id = $1 AND visitor_id IS NOT NULL
          )
      WHERE id = $1
    `, [eventId]);

    return result.rows[0];
  } catch (error) {
    console.error('Analytics recording error:', error);
    // Don't fail the request if analytics fail
    return null;
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

      // Get event details (only published and not expired)
      const eventResult = await client.query(`
        SELECT 
          id,
          event_name,
          slug,
          status,
          expiration_date,
          metadata,
          created_at
        FROM events
        WHERE id = $1 
          AND status = 'published' 
          AND (expiration_date IS NULL OR expiration_date > NOW())
      `, [id]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found, not published, or has expired'
        });
      }

      const event = eventResult.rows[0];

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

      // Get event details by slug
      const eventResult = await client.query(`
        SELECT 
          id,
          event_name,
          slug,
          status,
          expiration_date,
          metadata,
          created_at
        FROM events
        WHERE slug = $1 
          AND status = 'published' 
          AND (expiration_date IS NULL OR expiration_date > NOW())
      `, [slug]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found, not published, or has expired'
        });
      }

      const event = eventResult.rows[0];

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

// GET /api/v1/public/health - Public health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Public API is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;