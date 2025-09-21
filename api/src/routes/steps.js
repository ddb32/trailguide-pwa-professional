const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { uploadStepImage, handleUploadError, deleteUploadedFile } = require('../middleware/upload');

const router = express.Router();

// Validation schemas
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

const stepUpdateValidation = [
  body('step_order')
    .optional()
    .isInt({ min: 1 })
    .withMessage((value, { req }) => req.t('validation:step.orderPositive')),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage((value, { req }) => req.t('validation:step.descriptionLength')),
  body('image_url')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true; // Allow null/empty for removal
      return /^https?:\/\/.+/.test(value); // Simple URL validation
    })
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
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { eventId } = req.params;
    const { step_order, description, image_url = null, image_alt = null, metadata = {} } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Set statement timeout to prevent stuck transactions
      await client.query('SET statement_timeout = 30000'); // 30 seconds

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
        message: req.t('api:steps.createSuccess'),
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create step error:', {
      eventId: req.params.eventId,
      userId: req.user?.id,
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });

    // Enhanced error handling with comprehensive constraint violations
    let errorMessage = 'Failed to create step';
    let statusCode = 500;

    // Handle specific database constraint violations
    if (error.code === '23505') { // unique_violation
      if (error.constraint === 'steps_event_id_step_order_key') {
        errorMessage = 'A step with this order already exists in this guide';
        statusCode = 409;
      } else {
        errorMessage = 'This step conflicts with an existing step';
        statusCode = 409;
      }
    } else if (error.code === '23514') { // check_violation
      if (error.constraint === 'step_order_positive') {
        errorMessage = 'Step order must be a positive number';
        statusCode = 400;
      } else if (error.constraint === 'description_length') {
        errorMessage = 'Step description must be between 1 and 500 characters';
        statusCode = 400;
      } else {
        errorMessage = 'Step data does not meet requirements';
        statusCode = 400;
      }
    } else if (error.code === '23503') { // foreign_key_violation
      if (error.constraint === 'steps_event_id_fkey') {
        errorMessage = 'Guide not found or access denied';
        statusCode = 404;
      } else {
        errorMessage = 'Invalid reference data';
        statusCode = 400;
      }
    } else if (error.code === '25001') { // serialization_failure
      errorMessage = 'Database conflict occurred. Please try again';
      statusCode = 503;
    } else if (error.code === '57014') { // statement_timeout
      errorMessage = 'Step creation took too long. Please try again';
      statusCode = 408;
    } else if (error.code === '08006') { // connection_failure
      errorMessage = 'Database connection error. Please try again';
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error_code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
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
        message: req.t('validation:general.validationFailed'),
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
      message: req.t('api:steps.retrieveSuccess'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get step error:', error);
    res.status(500).json({
      success: false,
      message: req.t('api:steps.retrieveFailed')
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
        message: req.t('validation:general.validationFailed'),
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
          message: req.t('api:steps.notFound')
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
        message: req.t('validation:general.validationFailed'),
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
          message: req.t('api:steps.notFound')
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
        message: req.t('validation:general.validationFailed'),
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

// POST /api/v1/steps/:id/image - Upload image for a specific step
router.post('/:id/image', authenticateToken, [...uuidValidation, uploadStepImage, handleUploadError], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check if step exists and user has access
      const stepResult = await client.query(`
        SELECT s.id, s.event_id, s.image_url as current_image_url
        FROM steps s
        JOIN events e ON s.event_id = e.id
        WHERE s.id = $1 AND e.organizer_id = $2
      `, [id, req.user.id]);

      if (stepResult.rows.length === 0) {
        await client.query('ROLLBACK');
        // Clean up uploaded file
        deleteUploadedFile(req.file.filename);
        return res.status(404).json({
          success: false,
          message: req.t('api:steps.notFound')
        });
      }

      const step = stepResult.rows[0];
      const imageUrl = `/api/v1/images/${req.file.filename}`;
      const imageAlt = `Step ${step.id} image`;

      // Update step with new image URL
      const updateResult = await client.query(`
        UPDATE steps 
        SET 
          image_url = $1, 
          image_alt = $2,
          updated_at = NOW()
        WHERE id = $3
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
      `, [imageUrl, imageAlt, id]);

      await client.query('COMMIT');

      // Clean up old image if it exists (handle both old and new URL patterns)
      if (step.current_image_url) {
        let oldFilename = null;
        if (step.current_image_url.startsWith('/api/v1/uploads/')) {
          oldFilename = step.current_image_url.replace('/api/v1/uploads/', '');
        } else if (step.current_image_url.startsWith('/api/v1/images/')) {
          oldFilename = step.current_image_url.replace('/api/v1/images/', '');
        }
        
        if (oldFilename) {
          deleteUploadedFile(oldFilename);
        }
      }

      res.status(200).json({
        success: true,
        data: updateResult.rows[0],
        message: 'Step image uploaded successfully',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      // Clean up uploaded file on database error
      deleteUploadedFile(req.file.filename);
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Upload step image error:', error);
    
    // Clean up uploaded file on any error
    if (req.file) {
      deleteUploadedFile(req.file.filename);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload step image'
    });
  }
});

module.exports = router;