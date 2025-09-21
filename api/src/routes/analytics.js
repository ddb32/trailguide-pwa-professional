const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { query: dbQuery, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

const uuidValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format')
];

const timeRangeValidation = [
  query('timeRange')
    .optional()
    .isIn(['1d', '7d', '30d', '90d', 'all'])
    .withMessage('Invalid time range. Must be 1d, 7d, 30d, 90d, or all'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

/**
 * Helper function to build time range condition
 */
function buildTimeRangeCondition(timeRange, startDate, endDate) {
  if (startDate && endDate) {
    return `AND ev.viewed_at BETWEEN '${startDate}' AND '${endDate}'`;
  }

  switch (timeRange) {
    case '1d':
      return `AND ev.viewed_at >= NOW() - INTERVAL '1 day'`;
    case '7d':
      return `AND ev.viewed_at >= NOW() - INTERVAL '7 days'`;
    case '30d':
      return `AND ev.viewed_at >= NOW() - INTERVAL '30 days'`;
    case '90d':
      return `AND ev.viewed_at >= NOW() - INTERVAL '90 days'`;
    case 'all':
    default:
      return '';
  }
}

/**
 * GET /api/v1/analytics/overview
 * Get high-level analytics overview for the authenticated user
 */
router.get('/overview', timeRangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { timeRange = '30d', startDate, endDate } = req.query;
    const userId = req.user.id;
    const timeCondition = buildTimeRangeCondition(timeRange, startDate, endDate);

    const client = await getClient();
    try {
      // Get overall statistics
      const overviewResult = await client.query(`
        SELECT
          COUNT(DISTINCT e.id) as total_guides,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'published') as published_guides,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'draft') as draft_guides,
          COUNT(DISTINCT ev.id) as total_views,
          COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true) as completed_views,
          ROUND(
            COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true)::numeric /
            NULLIF(COUNT(DISTINCT ev.id), 0) * 100, 2
          ) as completion_rate,
          COUNT(DISTINCT ev.device_type) as device_types_count
        FROM events e
        LEFT JOIN event_views ev ON e.id = ev.event_id ${timeCondition}
        WHERE e.organizer_id = $1 AND e.deleted_at IS NULL
      `, [userId]);

      // Get device breakdown
      const deviceResult = await client.query(`
        SELECT
          ev.device_type,
          COUNT(*) as views,
          COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors
        FROM events e
        JOIN event_views ev ON e.id = ev.event_id
        WHERE e.organizer_id = $1 AND e.deleted_at IS NULL ${timeCondition}
        GROUP BY ev.device_type
        ORDER BY views DESC
      `, [userId]);

      // Get daily views trend (last 30 days)
      const trendsResult = await client.query(`
        SELECT
          DATE(ev.viewed_at) as date,
          COUNT(*) as views,
          COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
          COUNT(*) FILTER (WHERE ev.completed = true) as completions
        FROM events e
        JOIN event_views ev ON e.id = ev.event_id
        WHERE e.organizer_id = $1 AND e.deleted_at IS NULL
          AND ev.viewed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(ev.viewed_at)
        ORDER BY date DESC
        LIMIT 30
      `, [userId]);

      res.status(200).json({
        success: true,
        data: {
          overview: overviewResult.rows[0],
          deviceBreakdown: deviceResult.rows,
          dailyTrends: trendsResult.rows.reverse(), // Chronological order
          timeRange,
          generatedAt: new Date().toISOString()
        },
        message: 'Analytics overview retrieved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics overview'
    });
  }
});

/**
 * GET /api/v1/analytics/guides
 * Get detailed analytics for all guides owned by the user
 */
router.get('/guides', timeRangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { timeRange = '30d', startDate, endDate, limit = 50 } = req.query;
    const userId = req.user.id;
    const timeCondition = buildTimeRangeCondition(timeRange, startDate, endDate);

    const client = await getClient();
    try {
      const guidesResult = await client.query(`
        SELECT
          e.id,
          e.event_name,
          e.slug,
          e.status,
          e.created_at,
          e.expiration_date,
          e.metadata,
          COUNT(DISTINCT ev.id) as total_views,
          COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true) as completed_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.is_returning_visitor = true) as returning_visitor_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'mobile') as mobile_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'tablet') as tablet_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'desktop') as desktop_views,
          ROUND(
            COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true)::numeric /
            NULLIF(COUNT(DISTINCT ev.id), 0) * 100, 2
          ) as completion_rate,
          AVG(ev.completion_time_seconds) FILTER (WHERE ev.completion_time_seconds IS NOT NULL) as avg_completion_time,
          MAX(ev.viewed_at) as last_viewed
        FROM events e
        LEFT JOIN event_views ev ON e.id = ev.event_id ${timeCondition}
        WHERE e.organizer_id = $1 AND e.deleted_at IS NULL
        GROUP BY e.id, e.event_name, e.slug, e.status, e.created_at, e.expiration_date, e.metadata
        ORDER BY total_views DESC
        LIMIT $2
      `, [userId, limit]);

      res.status(200).json({
        success: true,
        data: {
          guides: guidesResult.rows,
          timeRange,
          generatedAt: new Date().toISOString()
        },
        message: 'Guide analytics retrieved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Guide analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guide analytics'
    });
  }
});

/**
 * GET /api/v1/analytics/guides/:id
 * Get detailed analytics for a specific guide
 */
router.get('/guides/:id', [...uuidValidation, ...timeRangeValidation], async (req, res) => {
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
    const { timeRange = '30d', startDate, endDate } = req.query;
    const userId = req.user.id;
    const timeCondition = buildTimeRangeCondition(timeRange, startDate, endDate);

    const client = await getClient();
    try {
      // Verify guide ownership
      const ownershipResult = await client.query(`
        SELECT id, event_name, slug, status FROM events
        WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL
      `, [id, userId]);

      if (ownershipResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Guide not found or access denied'
        });
      }

      const guide = ownershipResult.rows[0];

      // Get guide analytics
      const analyticsResult = await client.query(`
        SELECT
          COUNT(DISTINCT ev.id) as total_views,
          COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
          COUNT(DISTINCT ev.session_id) FILTER (WHERE ev.session_id IS NOT NULL) as unique_sessions,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true) as completed_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.is_returning_visitor = true) as returning_visitor_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'mobile') as mobile_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'tablet') as tablet_views,
          COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'desktop') as desktop_views,
          ROUND(
            COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true)::numeric /
            NULLIF(COUNT(DISTINCT ev.id), 0) * 100, 2
          ) as completion_rate,
          AVG(ev.completion_time_seconds) FILTER (WHERE ev.completion_time_seconds IS NOT NULL) as avg_completion_time,
          MIN(ev.viewed_at) as first_view,
          MAX(ev.viewed_at) as last_view
        FROM event_views ev
        WHERE ev.event_id = $1 ${timeCondition}
      `, [id]);

      // Get step-by-step analytics
      const stepAnalyticsResult = await client.query(`
        SELECT
          s.id,
          s.step_order,
          s.description,
          COUNT(sv.id) as views,
          AVG(sv.time_spent_seconds) FILTER (WHERE sv.time_spent_seconds IS NOT NULL) as avg_time_spent,
          COUNT(sv.id) * 100.0 / NULLIF(
            (SELECT COUNT(*) FROM event_views WHERE event_id = $1 ${timeCondition}), 0
          ) as view_rate
        FROM steps s
        LEFT JOIN step_views sv ON s.id = sv.step_id
        LEFT JOIN event_views ev ON sv.event_view_id = ev.id
        WHERE s.event_id = $1 ${timeCondition}
        GROUP BY s.id, s.step_order, s.description
        ORDER BY s.step_order
      `, [id]);

      // Get hourly distribution
      const hourlyResult = await client.query(`
        SELECT
          EXTRACT(hour FROM ev.viewed_at) as hour,
          COUNT(*) as views
        FROM event_views ev
        WHERE ev.event_id = $1 ${timeCondition}
        GROUP BY EXTRACT(hour FROM ev.viewed_at)
        ORDER BY hour
      `, [id]);

      res.status(200).json({
        success: true,
        data: {
          guide,
          analytics: analyticsResult.rows[0],
          stepAnalytics: stepAnalyticsResult.rows,
          hourlyDistribution: hourlyResult.rows,
          timeRange,
          generatedAt: new Date().toISOString()
        },
        message: 'Guide detailed analytics retrieved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Guide detailed analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guide detailed analytics'
    });
  }
});


/**
 * GET /api/v1/analytics/export/:id
 * Export analytics data for a specific guide
 */
router.get('/export/:id', [...uuidValidation, ...timeRangeValidation], async (req, res) => {
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
    const { timeRange = 'all', startDate, endDate, format = 'json' } = req.query;
    const userId = req.user.id;
    const timeCondition = buildTimeRangeCondition(timeRange, startDate, endDate);

    const client = await getClient();
    try {
      // Verify guide ownership
      const ownershipResult = await client.query(`
        SELECT id, event_name, slug FROM events
        WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL
      `, [id, userId]);

      if (ownershipResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Guide not found or access denied'
        });
      }

      const guide = ownershipResult.rows[0];

      // Get detailed analytics data for export
      const exportResult = await client.query(`
        SELECT
          ev.id as view_id,
          ev.visitor_id,
          ev.session_id,
          ev.device_type,
          ev.browser_info,
          ev.is_returning_visitor,
          ev.viewed_at,
          ev.completed,
          ev.completed_at,
          ev.completion_time_seconds,
          ev.ip_address,
          ev.referrer
        FROM event_views ev
        WHERE ev.event_id = $1 ${timeCondition}
        ORDER BY ev.viewed_at DESC
      `, [id]);

      const exportData = {
        guide: guide,
        analytics: exportResult.rows,
        exportedAt: new Date().toISOString(),
        timeRange: timeRange,
        totalRecords: exportResult.rows.length
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertToCSV(exportResult.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${guide.slug}_analytics.csv"`);
        res.send(csv);
      } else {
        res.status(200).json({
          success: true,
          data: exportData,
          message: 'Analytics data exported successfully'
        });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return value === null ? '' : `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;