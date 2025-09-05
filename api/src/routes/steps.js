const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const stepValidation = [
  body('step_order')
    .isInt({ min: 1 })
    .withMessage('Step order must be a positive integer'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('image_alt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Image alt text must be less than 500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const stepUpdateValidation = [
  body('step_order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Step order must be a positive integer'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('image_url')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true; // Allow null/empty for removal
      return /^https?:\/\/.+/.test(value); // Simple URL validation
    })
    .withMessage('Image URL must be a valid URL or null'),
  body('image_alt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Image alt text must be less than 500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const uuidValidation = [
  param('eventId')
    .optional()
    .isUUID()
    .withMessage('Invalid event ID format'),
  param('id')
    .optional()
    .isUUID()
    .withMessage('Invalid step ID format')
];

// Helper function to reorder steps after insertion/deletion
async function reorderSteps(client, eventId, startOrder = 1) {
  await client.query(`
    WITH ordered_steps AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY step_order, created_at) as new_order
      FROM steps 
      WHERE event_id = $1 AND step_order >= $2
    )
    UPDATE steps 
    SET step_order = ordered_steps.new_order + $2 - 1,
        updated_at = NOW()
    FROM ordered_steps 
    WHERE steps.id = ordered_steps.id
  `, [eventId, startOrder]);
}

// POST /api/v1/events/:eventId/steps - Add step to event
router.post('/:eventId/steps', authenticateToken, [...uuidValidation, ...stepValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.params;
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
          message: 'Event not found or access denied'
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

// GET /api/v1/steps/:id - Get single step
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

    const stepResult = await query(`
      SELECT 
        s.id,
        s.event_id,
        s.step_order,
        s.image_url,
        s.image_alt,
        s.description,
        s.view_count,
        s.completion_count,
        s.metadata,
        s.created_at,
        s.updated_at,
        e.event_name,
        e.status as event_status
      FROM steps s
      JOIN events e ON s.event_id = e.id
      WHERE s.id = $1 AND e.organizer_id = $2
    `, [id, req.user.id]);

    if (stepResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Step not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: stepResult.rows[0],
      message: 'Step retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get step error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve step'
    });
  }
});

// PUT /api/v1/steps/:id - Update step
router.put('/:id', authenticateToken, [...uuidValidation, ...stepUpdateValidation], async (req, res) => {
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

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check if step exists and user has access
      const existingStepResult = await client.query(`
        SELECT s.id, s.event_id, s.step_order
        FROM steps s
        JOIN events e ON s.event_id = e.id
        WHERE s.id = $1 AND e.organizer_id = $2
      `, [id, req.user.id]);

      if (existingStepResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Step not found or access denied'
        });
      }

      const existingStep = existingStepResult.rows[0];

      // Handle step order change
      if (updates.step_order !== undefined && updates.step_order !== existingStep.step_order) {
        const newOrder = updates.step_order;
        const oldOrder = existingStep.step_order;
        const eventId = existingStep.event_id;

        if (newOrder > oldOrder) {
          // Moving step down - decrease order of steps in between
          await client.query(`
            UPDATE steps 
            SET step_order = step_order - 1, updated_at = NOW()
            WHERE event_id = $1 AND step_order > $2 AND step_order <= $3
          `, [eventId, oldOrder, newOrder]);
        } else {
          // Moving step up - increase order of steps in between
          await client.query(`
            UPDATE steps 
            SET step_order = step_order + 1, updated_at = NOW()
            WHERE event_id = $1 AND step_order >= $2 AND step_order < $3
          `, [eventId, newOrder, oldOrder]);
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (updates.step_order !== undefined) {
        updateFields.push(`step_order = $${paramCount}`);
        updateValues.push(updates.step_order);
        paramCount++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        updateValues.push(updates.description);
        paramCount++;
      }

      if (updates.image_url !== undefined) {
        updateFields.push(`image_url = $${paramCount}`);
        updateValues.push(updates.image_url);
        paramCount++;
      }

      if (updates.image_alt !== undefined) {
        updateFields.push(`image_alt = $${paramCount}`);
        updateValues.push(updates.image_alt);
        paramCount++;
      }

      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramCount}`);
        updateValues.push(JSON.stringify(updates.metadata));
        paramCount++;
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const updateQuery = `
        UPDATE steps 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
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
      `;

      const result = await client.query(updateQuery, updateValues);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Step updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update step'
    });
  }
});

// DELETE /api/v1/steps/:id - Delete step and reorder
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

      // Get step details and verify access
      const stepResult = await client.query(`
        SELECT s.id, s.event_id, s.step_order, s.description
        FROM steps s
        JOIN events e ON s.event_id = e.id
        WHERE s.id = $1 AND e.organizer_id = $2
      `, [id, req.user.id]);

      if (stepResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Step not found or access denied'
        });
      }

      const step = stepResult.rows[0];

      // Delete the step
      await client.query('DELETE FROM steps WHERE id = $1', [id]);

      // Reorder remaining steps
      await client.query(`
        UPDATE steps 
        SET step_order = step_order - 1, updated_at = NOW()
        WHERE event_id = $1 AND step_order > $2
      `, [step.event_id, step.step_order]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          deletedStepId: id,
          eventId: step.event_id,
          deletedOrder: step.step_order
        },
        message: 'Step deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete step error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete step'
    });
  }
});

// PATCH /api/v1/steps/reorder - Bulk reorder steps
router.patch('/reorder', authenticateToken, [
  body('eventId')
    .isUUID()
    .withMessage('Event ID is required and must be a valid UUID'),
  body('stepOrders')
    .isArray({ min: 1 })
    .withMessage('Step orders must be a non-empty array'),
  body('stepOrders.*.stepId')
    .isUUID()
    .withMessage('Each step ID must be a valid UUID'),
  body('stepOrders.*.newOrder')
    .isInt({ min: 1 })
    .withMessage('Each new order must be a positive integer')
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

    const { eventId, stepOrders } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify event exists and belongs to user
      const eventResult = await client.query(
        'SELECT id FROM events WHERE id = $1 AND organizer_id = $2',
        [eventId, req.user.id]
      );

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Event not found or access denied'
        });
      }

      // Verify all steps belong to this event
      const stepIds = stepOrders.map(so => so.stepId);
      const stepVerificationResult = await client.query(
        'SELECT COUNT(*) as count FROM steps WHERE id = ANY($1) AND event_id = $2',
        [stepIds, eventId]
      );

      if (parseInt(stepVerificationResult.rows[0].count) !== stepIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'One or more steps do not belong to this event'
        });
      }

      // Update step orders
      for (const { stepId, newOrder } of stepOrders) {
        await client.query(
          'UPDATE steps SET step_order = $1, updated_at = NOW() WHERE id = $2',
          [newOrder, stepId]
        );
      }

      // Get updated steps to return
      const updatedStepsResult = await client.query(`
        SELECT 
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
        FROM steps
        WHERE event_id = $1
        ORDER BY step_order ASC
      `, [eventId]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          eventId,
          steps: updatedStepsResult.rows
        },
        message: 'Steps reordered successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reorder steps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder steps'
    });
  }
});

module.exports = router;