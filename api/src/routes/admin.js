const express = require('express');
const { param, query: expressQuery, validationResult } = require('express-validator');
const { getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Role-based admin access check using database role field
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has admin role in database
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// =============================================================================
// PLATFORM-WIDE ANALYTICS ENDPOINTS
// =============================================================================

// GET /api/v1/admin/analytics/overview - Platform-wide analytics overview
router.get('/analytics/overview', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 365 }).toInt().withMessage('Days must be between 1 and 365')
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

    const { days = 30 } = req.query;

    const client = await getClient();
    try {
      // Use the platform-wide analytics function from the migration
      const result = await client.query(`
        SELECT * FROM get_platform_analytics_summary($1)
      `, [days]);

      if (result.rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            summary: {
              total_organizers: 0,
              active_organizers: 0,
              total_guides: 0,
              published_guides: 0,
              deleted_guides: 0,
              total_views: 0,
              unique_visitors: 0,
              total_completions: 0,
              platform_completion_rate: 0,
              total_feedback: 0,
              platform_like_rate: 0,
              platform_helpful_rate: 0,
              avg_guide_creation_time: 0
            },
            top_performing_guides: [],
            organizer_activity: [],
            device_distribution: {},
            country_distribution: {},
            period_days: days
          },
          message: 'Platform analytics retrieved (no data available)',
          timestamp: new Date().toISOString()
        });
      }

      const analytics = result.rows[0];

      res.status(200).json({
        success: true,
        data: {
          summary: {
            total_organizers: parseInt(analytics.total_orgs) || 0,
            active_organizers: parseInt(analytics.active_orgs) || 0,
            total_guides: parseInt(analytics.total_guides) || 0,
            published_guides: parseInt(analytics.published_guides) || 0,
            deleted_guides: parseInt(analytics.deleted_guides) || 0,
            total_views: parseInt(analytics.total_views) || 0,
            unique_visitors: parseInt(analytics.unique_visitors) || 0,
            total_completions: parseInt(analytics.total_completions) || 0,
            platform_completion_rate: parseFloat(analytics.platform_completion_rate) || 0,
            total_feedback: parseInt(analytics.total_feedback) || 0,
            platform_like_rate: parseFloat(analytics.platform_like_rate) || 0,
            platform_helpful_rate: parseFloat(analytics.platform_helpful_rate) || 0,
            avg_guide_creation_time: parseFloat(analytics.avg_guide_creation_time) || 0
          },
          top_performing_guides: analytics.top_performing_guides || [],
          device_distribution: analytics.device_distribution || {},
          country_distribution: analytics.country_distribution || {},
          period_days: days
        },
        message: 'Platform analytics retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform analytics'
    });
  }
});


// GET /api/v1/admin/analytics/feedback - Platform-wide feedback analysis with dual feedback support
router.get('/analytics/feedback', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90'),
  expressQuery('limit').optional().isInt({ min: 1, max: 200 }).toInt().withMessage('Limit must be between 1 and 200'),
  expressQuery('type').optional().isIn(['guide', 'founder', 'all']).withMessage('Type must be guide, founder, or all')
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

    const { days = 7, limit = 100, type = 'all' } = req.query;

    const client = await getClient();
    try {
      // Build WHERE clause for feedback type filtering
      let typeCondition = '';
      let queryParams = [days];

      if (type === 'guide') {
        typeCondition = 'AND f.feedback_type = $3';
        queryParams.push('guide');
      } else if (type === 'founder') {
        typeCondition = 'AND f.feedback_type = $3';
        queryParams.push('founder');
      }

      // Add limit parameter
      queryParams.push(limit);
      const limitParam = `$${queryParams.length}`;

      // Get platform-wide feedback with guide and organizer context
      const result = await client.query(`
        SELECT
          f.id as feedback_id,
          f.feedback_type,
          f.liked,
          f.helpful,
          f.feedback_text,
          f.overall_rating,
          f.concept_rating,
          f.presentation_rating,
          f.recommend_rating,
          f.submitted_at,
          e.id as event_id,
          e.event_name,
          e.status as event_status,
          u.id as organizer_id,
          u.username as organizer_username,
          u.full_name as organizer_name
        FROM event_feedback f
        JOIN events e ON f.event_id = e.id
        JOIN users u ON e.organizer_id = u.id
        WHERE f.submitted_at > NOW() - INTERVAL '1 day' * $1
        ${typeCondition}
        ORDER BY f.submitted_at DESC
        LIMIT ${limitParam}
      `, queryParams);

      // Get comprehensive feedback statistics for dual feedback types
      const statsResult = await client.query(`
        SELECT
          COUNT(*) as total_feedback,
          COUNT(CASE WHEN feedback_type = 'guide' THEN 1 END) as guide_feedback_count,
          COUNT(CASE WHEN feedback_type = 'founder' THEN 1 END) as founder_feedback_count,

          -- Guide feedback statistics
          COUNT(CASE WHEN feedback_type = 'guide' AND liked = true THEN 1 END) as total_likes,
          COUNT(CASE WHEN feedback_type = 'guide' AND liked = false THEN 1 END) as total_dislikes,
          COUNT(CASE WHEN feedback_type = 'guide' AND helpful = true THEN 1 END) as total_helpful,
          COUNT(CASE WHEN feedback_type = 'guide' AND helpful = false THEN 1 END) as total_not_helpful,
          COUNT(CASE WHEN feedback_type = 'guide' AND liked IS NOT NULL THEN 1 END) as total_like_ratings,
          COUNT(CASE WHEN feedback_type = 'guide' AND helpful IS NOT NULL THEN 1 END) as total_helpful_ratings,

          -- Founder feedback statistics
          COUNT(CASE WHEN feedback_type = 'founder' AND overall_rating IS NOT NULL THEN 1 END) as founder_overall_ratings,
          COUNT(CASE WHEN feedback_type = 'founder' AND concept_rating IS NOT NULL THEN 1 END) as founder_concept_ratings,
          COUNT(CASE WHEN feedback_type = 'founder' AND presentation_rating IS NOT NULL THEN 1 END) as founder_presentation_ratings,
          COUNT(CASE WHEN feedback_type = 'founder' AND recommend_rating = 'yes' THEN 1 END) as founder_recommend_yes,
          COUNT(CASE WHEN feedback_type = 'founder' AND recommend_rating IS NOT NULL THEN 1 END) as founder_recommend_total,

          -- Text feedback count
          COUNT(CASE WHEN feedback_text IS NOT NULL AND feedback_text != '' THEN 1 END) as total_text_feedback
        FROM event_feedback
        WHERE submitted_at > NOW() - INTERVAL '1 day' * $1
        ${typeCondition}
      `, [days, ...(typeCondition ? [queryParams[1]] : [])]);

      // Get founder feedback averages
      const founderAvgsResult = await client.query(`
        SELECT
          ROUND(AVG(CASE
            WHEN overall_rating = 'excellent' THEN 3
            WHEN overall_rating = 'good' THEN 2
            WHEN overall_rating = 'poor' THEN 1
            ELSE NULL
          END), 2) as avg_overall_rating,
          ROUND(AVG(CASE
            WHEN concept_rating = 'excellent' THEN 3
            WHEN concept_rating = 'good' THEN 2
            WHEN concept_rating = 'poor' THEN 1
            ELSE NULL
          END), 2) as avg_concept_rating,
          ROUND(AVG(CASE
            WHEN presentation_rating = 'excellent' THEN 3
            WHEN presentation_rating = 'good' THEN 2
            WHEN presentation_rating = 'poor' THEN 1
            ELSE NULL
          END), 2) as avg_presentation_rating
        FROM event_feedback
        WHERE feedback_type = 'founder'
        AND submitted_at > NOW() - INTERVAL '1 day' * $1
        ${type === 'guide' ? 'AND FALSE' : ''}
      `, [days]);

      const stats = statsResult.rows[0];
      const founderAvgs = founderAvgsResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          feedback: result.rows.map(feedback => ({
            id: feedback.feedback_id,
            feedback_type: feedback.feedback_type,
            liked: feedback.liked,
            helpful: feedback.helpful,
            feedback_text: feedback.feedback_text,
            overall_rating: feedback.overall_rating,
            concept_rating: feedback.concept_rating,
            presentation_rating: feedback.presentation_rating,
            recommend_rating: feedback.recommend_rating,
            submitted_at: feedback.submitted_at,
            guide: {
              id: feedback.event_id,
              name: feedback.event_name,
              status: feedback.event_status
            },
            organizer: {
              id: feedback.organizer_id,
              username: feedback.organizer_username,
              name: feedback.organizer_name
            }
          })),
          statistics: {
            total_feedback: parseInt(stats.total_feedback) || 0,
            guide_feedback_count: parseInt(stats.guide_feedback_count) || 0,
            founder_feedback_count: parseInt(stats.founder_feedback_count) || 0,
            like_stats: {
              total_ratings: parseInt(stats.total_like_ratings) || 0,
              likes: parseInt(stats.total_likes) || 0,
              dislikes: parseInt(stats.total_dislikes) || 0,
              like_rate: stats.total_like_ratings > 0 ?
                parseFloat(stats.total_likes) / parseInt(stats.total_like_ratings) : 0
            },
            helpful_stats: {
              total_ratings: parseInt(stats.total_helpful_ratings) || 0,
              helpful: parseInt(stats.total_helpful) || 0,
              not_helpful: parseInt(stats.total_not_helpful) || 0,
              helpful_rate: stats.total_helpful_ratings > 0 ?
                parseFloat(stats.total_helpful) / parseInt(stats.total_helpful_ratings) : 0
            },
            founder_stats: {
              overall_rating_count: parseInt(stats.founder_overall_ratings) || 0,
              concept_rating_count: parseInt(stats.founder_concept_ratings) || 0,
              presentation_rating_count: parseInt(stats.founder_presentation_ratings) || 0,
              recommend_yes: parseInt(stats.founder_recommend_yes) || 0,
              recommend_total: parseInt(stats.founder_recommend_total) || 0,
              recommend_rate: stats.founder_recommend_total > 0 ?
                parseFloat(stats.founder_recommend_yes) / parseInt(stats.founder_recommend_total) : 0,
              avg_overall_rating: founderAvgs.avg_overall_rating || null,
              avg_concept_rating: founderAvgs.avg_concept_rating || null,
              avg_presentation_rating: founderAvgs.avg_presentation_rating || null
            },
            text_feedback_count: parseInt(stats.total_text_feedback) || 0
          },
          total_count: result.rows.length,
          period_days: days,
          limit
        },
        message: 'Platform feedback retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get platform feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform feedback'
    });
  }
});

// GET /api/v1/admin/analytics/usage - Usage patterns and trends
router.get('/analytics/usage', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90')
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

    const { days = 30 } = req.query;

    const client = await getClient();
    try {
      // Get usage patterns over time (daily breakdown)
      const dailyUsageResult = await client.query(`
        SELECT 
          DATE(viewed_at) as date,
          COUNT(*) as total_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_visitors,
          COUNT(DISTINCT event_id) as guides_accessed,
          COUNT(*) FILTER (WHERE completed = true) as completions,
          COUNT(*) FILTER (WHERE completed = true)::DECIMAL / COUNT(*) as completion_rate,
          COUNT(DISTINCT device_type) as device_types_used
        FROM event_views 
        WHERE viewed_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY DATE(viewed_at)
        ORDER BY date DESC
        LIMIT $1
      `, [days]);

      // Get device and browser distribution
      const deviceStatsResult = await client.query(`
        SELECT 
          device_type,
          browser_name,
          COUNT(*) as usage_count,
          COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_users,
          AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM event_views 
        WHERE viewed_at > NOW() - INTERVAL '1 day' * $1
          AND device_type IS NOT NULL
        GROUP BY device_type, browser_name
        ORDER BY usage_count DESC
      `, [days]);

      // Get geographic distribution
      const geoStatsResult = await client.query(`
        SELECT 
          country_code,
          COUNT(*) as usage_count,
          COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_users,
          AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM event_views 
        WHERE viewed_at > NOW() - INTERVAL '1 day' * $1
          AND country_code IS NOT NULL
        GROUP BY country_code
        ORDER BY usage_count DESC
        LIMIT 20
      `, [days]);

      res.status(200).json({
        success: true,
        data: {
          daily_usage: dailyUsageResult.rows.map(day => ({
            date: day.date,
            total_views: parseInt(day.total_views) || 0,
            unique_visitors: parseInt(day.unique_visitors) || 0,
            guides_accessed: parseInt(day.guides_accessed) || 0,
            completions: parseInt(day.completions) || 0,
            completion_rate: parseFloat(day.completion_rate) || 0,
            device_types_used: parseInt(day.device_types_used) || 0
          })),
          device_stats: deviceStatsResult.rows.map(device => ({
            device_type: device.device_type,
            browser_name: device.browser_name,
            usage_count: parseInt(device.usage_count) || 0,
            unique_users: parseInt(device.unique_users) || 0,
            completion_rate: parseFloat(device.completion_rate) || 0
          })),
          geographic_stats: geoStatsResult.rows.map(geo => ({
            country_code: geo.country_code,
            usage_count: parseInt(geo.usage_count) || 0,
            unique_users: parseInt(geo.unique_users) || 0,
            completion_rate: parseFloat(geo.completion_rate) || 0
          })),
          period_days: days
        },
        message: 'Usage patterns retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get usage patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage patterns'
    });
  }
});

// GET /api/v1/admin/analytics/export - Export all analytics data (CSV format)
router.get('/analytics/export', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 365 }).toInt().withMessage('Days must be between 1 and 365'),
  expressQuery('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv')
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

    const { days = 30, format = 'json' } = req.query;

    const client = await getClient();
    try {
      // Get comprehensive export data
      const exportResult = await client.query(`
        SELECT 
          e.id as guide_id,
          e.event_name as guide_name,
          e.status as guide_status,
          e.created_at as guide_created,
          e.deleted_at as guide_deleted,
          u.username as organizer_username,
          u.full_name as organizer_name,
          e.clicks_count as total_views,
          e.unique_visitors_count as unique_visitors,
          e.completion_count as total_completions,
          CASE WHEN e.clicks_count > 0 
            THEN e.completion_count::DECIMAL / e.clicks_count 
            ELSE 0 END as completion_rate,
          COUNT(DISTINCT f.id) as feedback_count,
          AVG(CASE WHEN f.liked IS NOT NULL THEN 
            CASE WHEN f.liked THEN 1.0 ELSE 0.0 END 
          END) as like_rate,
          AVG(CASE WHEN f.helpful IS NOT NULL THEN 
            CASE WHEN f.helpful THEN 1.0 ELSE 0.0 END 
          END) as helpful_rate,
          e.creation_duration_minutes,
          COUNT(DISTINCT s.id) as steps_count
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        LEFT JOIN event_feedback f ON e.id = f.event_id 
          AND f.submitted_at > NOW() - INTERVAL '1 day' * $1
        LEFT JOIN steps s ON e.id = s.event_id
        WHERE e.created_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY e.id, e.event_name, e.status, e.created_at, e.deleted_at,
                 u.username, u.full_name, e.clicks_count, e.unique_visitors_count,
                 e.completion_count, e.creation_duration_minutes
        ORDER BY e.created_at DESC
      `, [days]);

      if (format === 'csv') {
        // Generate CSV format
        const csvHeader = 'Guide ID,Guide Name,Status,Created,Deleted,Organizer,Organizer Name,Views,Unique Visitors,Completions,Completion Rate,Feedback Count,Like Rate,Helpful Rate,Creation Time (min),Steps Count\n';
        const csvData = exportResult.rows.map(row => 
          `"${row.guide_id}","${row.guide_name}","${row.guide_status}","${row.guide_created}","${row.guide_deleted || ''}","${row.organizer_username}","${row.organizer_name}",${row.total_views},${row.unique_visitors},${row.total_completions},${parseFloat(row.completion_rate || 0).toFixed(3)},${row.feedback_count},${parseFloat(row.like_rate || 0).toFixed(3)},${parseFloat(row.helpful_rate || 0).toFixed(3)},${row.creation_duration_minutes || ''},${row.steps_count}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="trailguide-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvHeader + csvData);
      } else {
        // JSON format
        res.status(200).json({
          success: true,
          data: {
            guides: exportResult.rows.map(row => ({
              guide_id: row.guide_id,
              guide_name: row.guide_name,
              status: row.guide_status,
              created_at: row.guide_created,
              deleted_at: row.guide_deleted,
              organizer: {
                username: row.organizer_username,
                name: row.organizer_name
              },
              analytics: {
                total_views: parseInt(row.total_views) || 0,
                unique_visitors: parseInt(row.unique_visitors) || 0,
                total_completions: parseInt(row.total_completions) || 0,
                completion_rate: parseFloat(row.completion_rate) || 0,
                feedback_count: parseInt(row.feedback_count) || 0,
                like_rate: parseFloat(row.like_rate) || 0,
                helpful_rate: parseFloat(row.helpful_rate) || 0,
                creation_duration_minutes: parseInt(row.creation_duration_minutes) || 0,
                steps_count: parseInt(row.steps_count) || 0
              }
            })),
            export_info: {
              period_days: days,
              exported_at: new Date().toISOString(),
              total_guides: exportResult.rows.length
            }
          },
          message: 'Analytics data exported successfully',
          timestamp: new Date().toISOString()
        });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

// =============================================================================
// ENHANCED DUAL FEEDBACK SYSTEM APIS
// =============================================================================

// GET /api/v1/admin/analytics/dual-feedback - Dual feedback overview data
router.get('/analytics/dual-feedback', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90')
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

    const { days = 30 } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = await getClient();
    try {
      // Guide feedback metrics
      const guideFeedbackResult = await client.query(`
        SELECT
          COUNT(*) as total_responses,
          COUNT(*) FILTER (WHERE helpful = true) as helpful_count,
          COUNT(*) FILTER (WHERE helpful = false) as not_helpful_count,
          COALESCE(
            CAST(COUNT(*) FILTER (WHERE helpful = true) AS FLOAT) /
            NULLIF(COUNT(*) FILTER (WHERE helpful IS NOT NULL), 0),
            0
          ) as helpful_rate
        FROM event_feedback ef
        JOIN events e ON ef.event_id = e.id
        WHERE ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
          AND e.deleted_at IS NULL
      `, [sinceDate]);

      // App concept feedback metrics (using 'liked' field for concept validation)
      const conceptFeedbackResult = await client.query(`
        SELECT
          COUNT(*) as total_responses,
          COUNT(*) FILTER (WHERE liked = true) as positive_count,
          COUNT(*) FILTER (WHERE liked = false) as negative_count,
          COALESCE(
            CAST(COUNT(*) FILTER (WHERE liked = true) AS FLOAT) /
            NULLIF(COUNT(*) FILTER (WHERE liked IS NOT NULL), 0),
            0
          ) as positive_rate
        FROM event_feedback ef
        JOIN events e ON ef.event_id = e.id
        WHERE ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
          AND e.deleted_at IS NULL
          AND ef.liked IS NOT NULL
      `, [sinceDate]);

      // Recent guide feedback comments
      const recentGuideFeedbackResult = await client.query(`
        SELECT
          ef.id,
          ef.event_id as guide_id,
          e.event_name as guide_name,
          u.name as organizer_name,
          ef.helpful,
          ef.feedback_text,
          ef.submitted_at
        FROM event_feedback ef
        JOIN events e ON ef.event_id = e.id
        JOIN users u ON e.organizer_id = u.id
        WHERE ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
          AND e.deleted_at IS NULL
          AND (ef.helpful IS NOT NULL OR ef.feedback_text IS NOT NULL)
        ORDER BY ef.submitted_at DESC
        LIMIT 10
      `, [sinceDate]);

      // Recent concept feedback comments
      const recentConceptFeedbackResult = await client.query(`
        SELECT
          ef.id,
          ef.event_id as guide_id,
          ef.liked as concept_liked,
          ef.feedback_text,
          ef.submitted_at
        FROM event_feedback ef
        JOIN events e ON ef.event_id = e.id
        WHERE ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
          AND e.deleted_at IS NULL
          AND ef.liked IS NOT NULL
        ORDER BY ef.submitted_at DESC
        LIMIT 10
      `, [sinceDate]);

      // Combined metrics
      const combinedResult = await client.query(`
        SELECT
          COUNT(DISTINCT ef.event_view_id) as total_responses,
          COUNT(DISTINCT ef.event_view_id) FILTER (
            WHERE ef.submitted_at >= $2
          ) as this_week_count,
          COALESCE(
            CAST(COUNT(DISTINCT ef.event_view_id) AS FLOAT) /
            NULLIF(COUNT(DISTINCT ev.id), 0),
            0
          ) as active_response_rate
        FROM event_views ev
        LEFT JOIN event_feedback ef ON ev.id = ef.event_view_id
        JOIN events e ON ev.event_id = e.id
        WHERE ev.created_at >= $1
          AND e.deleted_at IS NULL
      `, [sinceDate, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]);

      const guideFeedback = guideFeedbackResult.rows[0];
      const conceptFeedback = conceptFeedbackResult.rows[0];
      const combined = combinedResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          guideFeedback: {
            totalResponses: parseInt(guideFeedback.total_responses) || 0,
            helpfulRate: parseFloat(guideFeedback.helpful_rate) || 0,
            helpfulCount: parseInt(guideFeedback.helpful_count) || 0,
            notHelpfulCount: parseInt(guideFeedback.not_helpful_count) || 0,
            recentComments: recentGuideFeedbackResult.rows.map(row => ({
              id: row.id,
              guideId: row.guide_id,
              guideName: row.guide_name,
              organizerName: row.organizer_name,
              helpful: row.helpful,
              feedbackText: row.feedback_text,
              submittedAt: row.submitted_at
            }))
          },
          conceptFeedback: {
            totalResponses: parseInt(conceptFeedback.total_responses) || 0,
            positiveRate: parseFloat(conceptFeedback.positive_rate) || 0,
            positiveCount: parseInt(conceptFeedback.positive_count) || 0,
            negativeCount: parseInt(conceptFeedback.negative_count) || 0,
            recentComments: recentConceptFeedbackResult.rows.map(row => ({
              id: row.id,
              guideId: row.guide_id,
              conceptLiked: row.concept_liked,
              feedbackText: row.feedback_text,
              submittedAt: row.submitted_at
            }))
          },
          combined: {
            totalResponses: parseInt(combined.total_responses) || 0,
            thisWeekCount: parseInt(combined.this_week_count) || 0,
            activeResponseRate: parseFloat(combined.active_response_rate) || 0
          }
        },
        message: 'Dual feedback overview retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get dual feedback overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dual feedback overview'
    });
  }
});

// GET /api/v1/admin/analytics/organizer-performance - Organizer performance tracking
router.get('/analytics/organizer-performance', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90'),
  expressQuery('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100')
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

    const { days = 30, limit = 50 } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = await getClient();
    try {
      // Get organizer performance data
      const performanceResult = await client.query(`
        SELECT
          e.id as guide_id,
          e.event_name as guide_name,
          e.organizer_id,
          u.name as organizer_name,
          u.username as organizer_username,
          e.status as guide_status,
          COUNT(ef.id) as total_responses,
          COUNT(ef.id) FILTER (WHERE ef.helpful = true) as helpful_count,
          COUNT(ef.id) FILTER (WHERE ef.helpful = false) as not_helpful_count,
          COALESCE(
            CAST(COUNT(ef.id) FILTER (WHERE ef.helpful = true) AS FLOAT) /
            NULLIF(COUNT(ef.id) FILTER (WHERE ef.helpful IS NOT NULL), 0),
            0
          ) as helpful_rate,
          MAX(ef.submitted_at) as last_feedback_at
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        LEFT JOIN event_feedback ef ON e.id = ef.event_id
          AND ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
        WHERE e.deleted_at IS NULL
          AND e.status IN ('published', 'expired')
        GROUP BY e.id, e.event_name, e.organizer_id, u.name, u.username, e.status
        HAVING COUNT(ef.id) > 0
        ORDER BY helpful_rate DESC, total_responses DESC
        LIMIT $2
      `, [sinceDate, limit]);

      // Get recent comments for each guide
      const guides = [];
      for (const row of performanceResult.rows) {
        const commentsResult = await client.query(`
          SELECT
            ef.id,
            ef.helpful,
            ef.feedback_text,
            ef.submitted_at
          FROM event_feedback ef
          WHERE ef.event_id = $1
            AND ef.feedback_type = 'guide'
            AND ef.submitted_at >= $2
            AND (ef.helpful IS NOT NULL OR ef.feedback_text IS NOT NULL)
          ORDER BY ef.submitted_at DESC
          LIMIT 5
        `, [row.guide_id, sinceDate]);

        guides.push({
          guideId: row.guide_id,
          guideName: row.guide_name,
          organizerId: row.organizer_id,
          organizerName: row.organizer_name,
          organizerUsername: row.organizer_username,
          totalResponses: parseInt(row.total_responses) || 0,
          helpfulCount: parseInt(row.helpful_count) || 0,
          notHelpfulCount: parseInt(row.not_helpful_count) || 0,
          helpfulRate: parseFloat(row.helpful_rate) || 0,
          recentComments: commentsResult.rows.map(comment => ({
            id: comment.id,
            helpful: comment.helpful,
            feedbackText: comment.feedback_text,
            submittedAt: comment.submitted_at
          })),
          lastFeedbackAt: row.last_feedback_at,
          guideStatus: row.guide_status
        });
      }

      // Calculate summary statistics
      const summaryResult = await client.query(`
        SELECT
          COUNT(DISTINCT e.organizer_id) as total_organizers,
          COUNT(DISTINCT e.id) as total_guides_with_feedback,
          AVG(guide_stats.helpful_rate) as average_helpful_rate,
          SUM(guide_stats.total_responses) as total_feedback_responses
        FROM events e
        JOIN (
          SELECT
            e.id,
            COALESCE(
              CAST(COUNT(ef.id) FILTER (WHERE ef.helpful = true) AS FLOAT) /
              NULLIF(COUNT(ef.id) FILTER (WHERE ef.helpful IS NOT NULL), 0),
              0
            ) as helpful_rate,
            COUNT(ef.id) as total_responses
          FROM events e
          LEFT JOIN event_feedback ef ON e.id = ef.event_id
            AND ef.feedback_type = 'guide'
            AND ef.submitted_at >= $1
          WHERE e.deleted_at IS NULL
            AND e.status IN ('published', 'expired')
          GROUP BY e.id
          HAVING COUNT(ef.id) > 0
        ) guide_stats ON e.id = guide_stats.id
        WHERE e.deleted_at IS NULL
      `, [sinceDate]);

      const summary = summaryResult.rows[0] || {
        total_organizers: 0,
        total_guides_with_feedback: 0,
        average_helpful_rate: 0,
        total_feedback_responses: 0
      };

      res.status(200).json({
        success: true,
        data: {
          guides,
          summary: {
            totalOrganizers: parseInt(summary.total_organizers) || 0,
            totalGuidesWithFeedback: parseInt(summary.total_guides_with_feedback) || 0,
            averageHelpfulRate: parseFloat(summary.average_helpful_rate) || 0,
            totalFeedbackResponses: parseInt(summary.total_feedback_responses) || 0
          }
        },
        message: 'Organizer performance data retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get organizer performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve organizer performance data'
    });
  }
});

// GET /api/v1/admin/analytics/pilot-health - Pilot health metrics
router.get('/analytics/pilot-health', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90')
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

    const { days = 30 } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = await getClient();
    try {
      // Engagement metrics
      const engagementResult = await client.query(`
        SELECT
          COUNT(DISTINCT ev.visitor_id) as active_users,
          COUNT(DISTINCT ev.visitor_id) FILTER (
            WHERE ev.created_at >= CURRENT_DATE
          ) as daily_active_users,
          COUNT(DISTINCT ev.visitor_id) FILTER (
            WHERE ev.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as weekly_active_users,
          COUNT(DISTINCT ev.visitor_id) FILTER (
            WHERE ev.created_at >= CURRENT_DATE - INTERVAL '30 days'
          ) as monthly_active_users,
          AVG(EXTRACT(EPOCH FROM (ev.last_step_at - ev.created_at)) / 60) as average_session_time,
          COALESCE(
            CAST(COUNT(ev.id) FILTER (WHERE ev.completed = true) AS FLOAT) /
            NULLIF(COUNT(ev.id), 0),
            0
          ) as guide_completion_rate,
          COALESCE(
            CAST(COUNT(DISTINCT ef.event_view_id) AS FLOAT) /
            NULLIF(COUNT(DISTINCT ev.id), 0),
            0
          ) as feedback_participation_rate
        FROM event_views ev
        LEFT JOIN event_feedback ef ON ev.id = ef.event_view_id
        JOIN events e ON ev.event_id = e.id
        WHERE ev.created_at >= $1
          AND e.deleted_at IS NULL
      `, [sinceDate]);

      // Content performance metrics
      const contentResult = await client.query(`
        SELECT
          COUNT(*) as total_guides,
          COUNT(*) FILTER (WHERE status = 'published') as active_guides,
          AVG(
            CASE
              WHEN steps_count > 0 THEN steps_count
              ELSE NULL
            END
          ) as average_guide_length,
          COUNT(DISTINCT ef.event_id) as guides_with_feedback,
          AVG(
            CASE
              WHEN ef.helpful IS NOT NULL THEN
                CASE WHEN ef.helpful THEN 5.0 ELSE 1.0 END
              ELSE NULL
            END
          ) as average_rating
        FROM events e
        LEFT JOIN event_feedback ef ON e.id = ef.event_id
          AND ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
        WHERE e.deleted_at IS NULL
          AND e.created_at >= $1
      `, [sinceDate]);

      // Top performing guides
      const topGuidesResult = await client.query(`
        SELECT
          e.id,
          e.event_name as name,
          u.name as organizer_name,
          COALESCE(
            CAST(COUNT(ef.id) FILTER (WHERE ef.helpful = true) AS FLOAT) /
            NULLIF(COUNT(ef.id) FILTER (WHERE ef.helpful IS NOT NULL), 0),
            0
          ) as helpful_rate,
          COUNT(ef.id) as response_count
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        LEFT JOIN event_feedback ef ON e.id = ef.event_id
          AND ef.feedback_type = 'guide'
          AND ef.submitted_at >= $1
        WHERE e.deleted_at IS NULL
          AND e.status = 'published'
        GROUP BY e.id, e.event_name, u.name
        HAVING COUNT(ef.id) >= 3
        ORDER BY helpful_rate DESC, response_count DESC
        LIMIT 5
      `, [sinceDate]);

      // Growth metrics
      const growthResult = await client.query(`
        SELECT
          COUNT(DISTINCT ev.visitor_id) FILTER (
            WHERE ev.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as new_users_this_week,
          COUNT(DISTINCT ev.visitor_id) FILTER (
            WHERE ev.created_at >= CURRENT_DATE - INTERVAL '30 days'
          ) as new_users_this_month,
          0 as user_growth_rate, -- Simplified for now
          COUNT(e.id) FILTER (
            WHERE e.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as guide_creation_rate,
          COUNT(ef.id) FILTER (
            WHERE ef.submitted_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as feedback_growth_rate
        FROM event_views ev
        FULL OUTER JOIN events e ON ev.event_id = e.id
        FULL OUTER JOIN event_feedback ef ON e.id = ef.event_id
        WHERE (ev.created_at >= $1 OR e.created_at >= $1 OR ef.submitted_at >= $1)
          AND (e.id IS NULL OR e.deleted_at IS NULL)
      `, [sinceDate]);

      // Health issues detection
      const engagement = engagementResult.rows[0];
      const content = contentResult.rows[0];
      const growth = growthResult.rows[0];

      const issues = [];
      const completionRate = parseFloat(engagement.guide_completion_rate) || 0;
      const feedbackRate = parseFloat(engagement.feedback_participation_rate) || 0;
      const avgRating = parseFloat(content.average_rating) || 0;

      if (completionRate < 0.5) {
        issues.push({
          type: 'warning',
          message: 'Guide completion rate is below 50%',
          metric: 'completion_rate',
          value: completionRate,
          threshold: 0.5
        });
      }

      if (feedbackRate < 0.2) {
        issues.push({
          type: 'warning',
          message: 'Feedback participation rate is below 20%',
          metric: 'feedback_rate',
          value: feedbackRate,
          threshold: 0.2
        });
      }

      if (avgRating < 3.5) {
        issues.push({
          type: 'error',
          message: 'Average guide rating is below 3.5/5',
          metric: 'average_rating',
          value: avgRating,
          threshold: 3.5
        });
      }

      // Calculate health scores
      const engagementScore = Math.min(100, (completionRate * 50 + feedbackRate * 50));
      const contentScore = Math.min(100, ((avgRating / 5) * 60 + (parseInt(content.guides_with_feedback) / Math.max(parseInt(content.active_guides), 1)) * 40));
      const growthScore = Math.min(100, Math.max(0, 70)); // Simplified growth score
      const overallScore = (engagementScore + contentScore + growthScore) / 3;

      res.status(200).json({
        success: true,
        data: {
          engagement: {
            activeUsers: parseInt(engagement.active_users) || 0,
            dailyActiveUsers: parseInt(engagement.daily_active_users) || 0,
            weeklyActiveUsers: parseInt(engagement.weekly_active_users) || 0,
            monthlyActiveUsers: parseInt(engagement.monthly_active_users) || 0,
            averageSessionTime: parseFloat(engagement.average_session_time) || 0,
            guideCompletionRate: completionRate,
            feedbackParticipationRate: feedbackRate
          },
          content: {
            totalGuides: parseInt(content.total_guides) || 0,
            activeGuides: parseInt(content.active_guides) || 0,
            averageGuideLength: parseFloat(content.average_guide_length) || 0,
            guidesWithFeedback: parseInt(content.guides_with_feedback) || 0,
            averageRating: avgRating,
            topPerformingGuides: topGuidesResult.rows.map(guide => ({
              id: guide.id,
              name: guide.name,
              organizerName: guide.organizer_name,
              helpfulRate: parseFloat(guide.helpful_rate) || 0,
              responseCount: parseInt(guide.response_count) || 0
            }))
          },
          growth: {
            newUsersThisWeek: parseInt(growth.new_users_this_week) || 0,
            newUsersThisMonth: parseInt(growth.new_users_this_month) || 0,
            userGrowthRate: parseFloat(growth.user_growth_rate) || 0,
            guideCreationRate: parseInt(growth.guide_creation_rate) || 0,
            feedbackGrowthRate: parseInt(growth.feedback_growth_rate) || 0
          },
          health: {
            overallScore: Math.round(overallScore),
            engagementScore: Math.round(engagementScore),
            contentScore: Math.round(contentScore),
            growthScore: Math.round(growthScore),
            issues
          }
        },
        message: 'Pilot health metrics retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get pilot health metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pilot health metrics'
    });
  }
});

// POST /api/v1/admin/analytics/reset - Safely reset analytics data for clean validation
router.post('/analytics/reset', [
  authenticateToken,
  requireAdmin,
  expressQuery('confirm').isIn(['true']).withMessage('Confirmation required: ?confirm=true'),
  expressQuery('preserve_guides').optional().isBoolean().withMessage('preserve_guides must be boolean')
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

    const { preserve_guides = 'true' } = req.query;
    const preserveGuides = preserve_guides === 'true';

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Track what we're about to reset for the response
      const beforeReset = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM event_views) as total_views,
          (SELECT COUNT(*) FROM event_feedback) as total_feedback,
          (SELECT COUNT(*) FROM step_views) as total_step_views,
          (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) as total_guides
      `);

      const before = beforeReset.rows[0];

      // Reset analytics data tables (SAFE - only tracking data, not core content)
      console.log('🔄 Resetting analytics data safely...');

      // 1. Reset event feedback (user feedback data)
      await client.query('DELETE FROM event_feedback');
      console.log('✅ Cleared event feedback data');

      // 2. Reset event views (visitor tracking data)
      await client.query('DELETE FROM event_views');
      console.log('✅ Cleared event views data');

      // 3. Reset step views (step-level tracking data)
      await client.query('DELETE FROM step_views');
      console.log('✅ Cleared step views data');

      // 4. Reset analytics counters on events and steps (derived data)
      await client.query(`
        UPDATE events SET
          clicks_count = 0,
          completion_count = 0,
          view_count = 0
        WHERE deleted_at IS NULL
      `);
      console.log('✅ Reset events analytics counters');

      await client.query(`
        UPDATE steps SET
          view_count = 0
      `);
      console.log('✅ Reset steps analytics counters');

      // 5. Optional: Reset guide data if not preserving guides
      let guidesDeleted = 0;
      if (!preserveGuides) {
        // Soft delete all guides (keeps data structure but marks as deleted)
        const deleteResult = await client.query(`
          UPDATE events
          SET deleted_at = NOW(),
              status = 'archived'
          WHERE deleted_at IS NULL
          RETURNING id
        `);
        guidesDeleted = deleteResult.rows.length;
        console.log(`✅ Soft deleted ${guidesDeleted} guides`);
      }

      await client.query('COMMIT');

      // Track what we reset for the response
      const afterReset = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM event_views) as total_views,
          (SELECT COUNT(*) FROM event_feedback) as total_feedback,
          (SELECT COUNT(*) FROM step_views) as total_step_views,
          (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) as total_guides
      `);

      const after = afterReset.rows[0];

      res.status(200).json({
        success: true,
        data: {
          reset_summary: {
            views_cleared: parseInt(before.total_views) || 0,
            feedback_cleared: parseInt(before.total_feedback) || 0,
            step_views_cleared: parseInt(before.total_step_views) || 0,
            guides_deleted: guidesDeleted,
            guides_preserved: preserveGuides
          },
          before_reset: {
            total_views: parseInt(before.total_views) || 0,
            total_feedback: parseInt(before.total_feedback) || 0,
            total_step_views: parseInt(before.total_step_views) || 0,
            total_guides: parseInt(before.total_guides) || 0
          },
          after_reset: {
            total_views: parseInt(after.total_views) || 0,
            total_feedback: parseInt(after.total_feedback) || 0,
            total_step_views: parseInt(after.total_step_views) || 0,
            total_guides: parseInt(after.total_guides) || 0
          },
          safety_notes: [
            'Only analytics and tracking data was cleared',
            preserveGuides ? 'All guides and their content were preserved' : 'Guides were soft-deleted (can be restored)',
            'User accounts and system data remain intact',
            'Database structure and indexes remain intact'
          ]
        },
        message: 'Analytics data reset completed successfully - clean validation environment ready',
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reset analytics data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset analytics data'
    });
  }
});

module.exports = router;