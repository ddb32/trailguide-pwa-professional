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

// =============================================================================
// USER-SPECIFIC ANALYTICS ENDPOINTS FOR ENHANCED ADMIN INTERFACE
// =============================================================================

// GET /api/v1/admin/analytics/organizers - List all organizers with basic metrics
router.get('/analytics/organizers', [
  authenticateToken,
  requireAdmin,
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90'),
  expressQuery('search').optional().isString().withMessage('Search must be a string'),
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

    const { days = 30, search = '', limit = 50 } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = await getClient();
    try {
      // Build search condition
      let searchCondition = '';
      let queryParams = [sinceDate];

      if (search.trim()) {
        searchCondition = `AND (u.username ILIKE $2 OR u.full_name ILIKE $2)`;
        queryParams.push(`%${search.trim()}%`);
      }

      // Get organizers with their guide count and feedback metrics
      const organizersResult = await client.query(`
        SELECT DISTINCT
          u.id as organizer_id,
          u.username,
          u.full_name as name,
          u.email,
          u.created_at as joined_at,
          COUNT(DISTINCT e.id) as total_guides,
          COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_guides,
          COUNT(DISTINCT CASE WHEN e.deleted_at IS NULL THEN e.id END) as active_guides,
          COUNT(DISTINCT ef.id) as total_feedback_received,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.feedback_type = 'guide') as guide_feedback_count,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.feedback_type = 'founder') as founder_feedback_count,
          COALESCE(
            AVG(CASE WHEN ef.helpful = true THEN 1.0 WHEN ef.helpful = false THEN 0.0 END),
            0
          ) as avg_helpful_rate,
          COALESCE(
            AVG(CASE WHEN ef.liked = true THEN 1.0 WHEN ef.liked = false THEN 0.0 END),
            0
          ) as avg_like_rate,
          MAX(ef.submitted_at) as last_feedback_received,
          SUM(e.clicks_count) as total_views,
          SUM(e.completion_count) as total_completions,
          CASE
            WHEN SUM(e.clicks_count) > 0
            THEN COALESCE(SUM(e.completion_count)::DECIMAL / SUM(e.clicks_count), 0)
            ELSE 0
          END as avg_completion_rate
        FROM users u
        LEFT JOIN events e ON u.id = e.organizer_id AND e.created_at >= $1
        LEFT JOIN event_feedback ef ON e.id = ef.event_id AND ef.submitted_at >= $1
        WHERE u.role IN ('user', 'admin')
          ${searchCondition}
        GROUP BY u.id, u.username, u.full_name, u.email, u.created_at
        HAVING COUNT(DISTINCT e.id) > 0
        ORDER BY total_feedback_received DESC, total_guides DESC, u.username
        LIMIT ${queryParams.length === 1 ? '$2' : '$3'}
      `, search.trim() ? [...queryParams, limit] : [...queryParams, limit]);

      res.status(200).json({
        success: true,
        data: {
          organizers: organizersResult.rows.map(org => ({
            organizer_id: org.organizer_id,
            username: org.username,
            name: org.name,
            email: org.email,
            joined_at: org.joined_at,
            metrics: {
              total_guides: parseInt(org.total_guides) || 0,
              published_guides: parseInt(org.published_guides) || 0,
              active_guides: parseInt(org.active_guides) || 0,
              total_feedback_received: parseInt(org.total_feedback_received) || 0,
              guide_feedback_count: parseInt(org.guide_feedback_count) || 0,
              founder_feedback_count: parseInt(org.founder_feedback_count) || 0,
              avg_helpful_rate: parseFloat(org.avg_helpful_rate) || 0,
              avg_like_rate: parseFloat(org.avg_like_rate) || 0,
              total_views: parseInt(org.total_views) || 0,
              total_completions: parseInt(org.total_completions) || 0,
              avg_completion_rate: parseFloat(org.avg_completion_rate) || 0,
              last_feedback_received: org.last_feedback_received
            }
          })),
          search_params: {
            days,
            search: search.trim(),
            limit,
            total_results: organizersResult.rows.length
          }
        },
        message: 'Organizers list retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get organizers list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve organizers list'
    });
  }
});

// GET /api/v1/admin/analytics/organizer/:organizer_id/guides - List guides for specific organizer
router.get('/analytics/organizer/:organizer_id/guides', [
  authenticateToken,
  requireAdmin,
  param('organizer_id').isUUID().withMessage('Organizer ID must be a valid UUID'),
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90'),
  expressQuery('status').optional().isIn(['all', 'published', 'draft', 'expired', 'archived']).withMessage('Status must be valid')
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

    const { organizer_id } = req.params;
    const { days = 30, status = 'all' } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = await getClient();
    try {
      // First verify organizer exists
      const organizerResult = await client.query(`
        SELECT id, username, full_name, email
        FROM users
        WHERE id = $1 AND role IN ('user', 'admin')
      `, [organizer_id]);

      if (organizerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Organizer not found'
        });
      }

      const organizer = organizerResult.rows[0];

      // Build status filter
      let statusCondition = '';
      if (status !== 'all') {
        statusCondition = `AND e.status = '${status}'`;
      }

      // Get guides for the organizer with detailed feedback metrics
      const guidesResult = await client.query(`
        SELECT
          e.id as guide_id,
          e.event_name as guide_name,
          e.status,
          e.created_at,
          e.updated_at,
          e.deleted_at,
          e.activation_date,
          e.expiration_date,
          e.clicks_count as total_views,
          e.completion_count as total_completions,
          e.unique_visitors_count as unique_visitors,
          CASE
            WHEN e.clicks_count > 0
            THEN COALESCE(e.completion_count::DECIMAL / e.clicks_count, 0)
            ELSE 0
          END as completion_rate,
          COUNT(DISTINCT ef.id) as total_feedback,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.feedback_type = 'guide') as guide_feedback_count,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.feedback_type = 'founder') as founder_feedback_count,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.helpful = true) as helpful_count,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.helpful = false) as not_helpful_count,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.liked = true) as liked_count,
          COUNT(DISTINCT ef.id) FILTER (WHERE ef.liked = false) as disliked_count,
          COALESCE(
            CAST(COUNT(DISTINCT ef.id) FILTER (WHERE ef.helpful = true) AS FLOAT) /
            NULLIF(COUNT(DISTINCT ef.id) FILTER (WHERE ef.helpful IS NOT NULL), 0),
            0
          ) as helpful_rate,
          COALESCE(
            CAST(COUNT(DISTINCT ef.id) FILTER (WHERE ef.liked = true) AS FLOAT) /
            NULLIF(COUNT(DISTINCT ef.id) FILTER (WHERE ef.liked IS NOT NULL), 0),
            0
          ) as like_rate,
          MAX(ef.submitted_at) as last_feedback_at,
          COUNT(DISTINCT s.id) as steps_count
        FROM events e
        LEFT JOIN event_feedback ef ON e.id = ef.event_id AND ef.submitted_at >= $2
        LEFT JOIN steps s ON e.id = s.event_id
        WHERE e.organizer_id = $1
          ${statusCondition}
          AND (e.deleted_at IS NULL OR $3 = 'archived')
        GROUP BY e.id, e.event_name, e.status, e.created_at, e.updated_at, e.deleted_at,
                 e.activation_date, e.expiration_date, e.clicks_count, e.completion_count, e.unique_visitors_count
        ORDER BY e.created_at DESC
      `, [organizer_id, sinceDate, status]);

      res.status(200).json({
        success: true,
        data: {
          organizer: {
            id: organizer.id,
            username: organizer.username,
            name: organizer.full_name,
            email: organizer.email
          },
          guides: guidesResult.rows.map(guide => ({
            guide_id: guide.guide_id,
            guide_name: guide.guide_name,
            status: guide.status,
            created_at: guide.created_at,
            updated_at: guide.updated_at,
            deleted_at: guide.deleted_at,
            activation_date: guide.activation_date,
            expiration_date: guide.expiration_date,
            steps_count: parseInt(guide.steps_count) || 0,
            analytics: {
              total_views: parseInt(guide.total_views) || 0,
              unique_visitors: parseInt(guide.unique_visitors) || 0,
              total_completions: parseInt(guide.total_completions) || 0,
              completion_rate: parseFloat(guide.completion_rate) || 0,
              total_feedback: parseInt(guide.total_feedback) || 0,
              guide_feedback_count: parseInt(guide.guide_feedback_count) || 0,
              founder_feedback_count: parseInt(guide.founder_feedback_count) || 0,
              helpful_count: parseInt(guide.helpful_count) || 0,
              not_helpful_count: parseInt(guide.not_helpful_count) || 0,
              liked_count: parseInt(guide.liked_count) || 0,
              disliked_count: parseInt(guide.disliked_count) || 0,
              helpful_rate: parseFloat(guide.helpful_rate) || 0,
              like_rate: parseFloat(guide.like_rate) || 0,
              last_feedback_at: guide.last_feedback_at
            }
          })),
          summary: {
            total_guides: guidesResult.rows.length,
            published_guides: guidesResult.rows.filter(g => g.status === 'published').length,
            total_views: guidesResult.rows.reduce((sum, g) => sum + (parseInt(g.total_views) || 0), 0),
            total_feedback: guidesResult.rows.reduce((sum, g) => sum + (parseInt(g.total_feedback) || 0), 0),
            avg_helpful_rate: guidesResult.rows.length > 0 ?
              guidesResult.rows.reduce((sum, g) => sum + (parseFloat(g.helpful_rate) || 0), 0) / guidesResult.rows.length : 0
          },
          filter_params: {
            days,
            status,
            since_date: sinceDate
          }
        },
        message: `Retrieved ${guidesResult.rows.length} guides for organizer ${organizer.username}`,
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get organizer guides error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve organizer guides'
    });
  }
});

// GET /api/v1/admin/analytics/guide/:guide_id/feedback-detailed - Detailed feedback analytics for specific guide
router.get('/analytics/guide/:guide_id/feedback-detailed', [
  authenticateToken,
  requireAdmin,
  param('guide_id').isUUID().withMessage('Guide ID must be a valid UUID'),
  expressQuery('days').optional().isInt({ min: 1, max: 90 }).toInt().withMessage('Days must be between 1 and 90'),
  expressQuery('feedback_type').optional().isIn(['guide', 'founder', 'all']).withMessage('Feedback type must be guide, founder, or all')
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

    const { guide_id } = req.params;
    const { days = 30, feedback_type = 'all' } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const client = await getClient();
    try {
      // First verify guide exists and get basic info
      const guideResult = await client.query(`
        SELECT
          e.id,
          e.event_name,
          e.status,
          e.organizer_id,
          u.username as organizer_username,
          u.full_name as organizer_name,
          e.created_at,
          e.clicks_count,
          e.completion_count,
          e.unique_visitors_count
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        WHERE e.id = $1
      `, [guide_id]);

      if (guideResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Guide not found'
        });
      }

      const guide = guideResult.rows[0];

      // Build feedback type filter
      let typeCondition = '';
      if (feedback_type !== 'all') {
        typeCondition = `AND ef.feedback_type = '${feedback_type}'`;
      }

      // Get detailed feedback entries
      const feedbackResult = await client.query(`
        SELECT
          ef.id,
          ef.feedback_type,
          ef.liked,
          ef.helpful,
          ef.overall_rating,
          ef.concept_rating,
          ef.presentation_rating,
          ef.recommend_rating,
          ef.feedback_text,
          ef.submitted_at,
          ef.visitor_id,
          ef.ip_address,
          ev.device_type,
          ev.browser_name,
          ev.country_code,
          ev.completed as guide_completed
        FROM event_feedback ef
        LEFT JOIN event_views ev ON ef.event_view_id = ev.id
        WHERE ef.event_id = $1
          AND ef.submitted_at >= $2
          ${typeCondition}
        ORDER BY ef.submitted_at DESC
      `, [guide_id, sinceDate]);

      // Get comprehensive statistics
      const statsResult = await client.query(`
        SELECT
          COUNT(*) as total_feedback,
          COUNT(*) FILTER (WHERE feedback_type = 'guide') as guide_feedback_count,
          COUNT(*) FILTER (WHERE feedback_type = 'founder') as founder_feedback_count,

          -- Guide feedback stats (helpful/not helpful and like/dislike)
          COUNT(*) FILTER (WHERE helpful = true) as helpful_count,
          COUNT(*) FILTER (WHERE helpful = false) as not_helpful_count,
          COUNT(*) FILTER (WHERE helpful IS NOT NULL) as helpful_total_responses,
          COUNT(*) FILTER (WHERE liked = true) as liked_count,
          COUNT(*) FILTER (WHERE liked = false) as disliked_count,
          COUNT(*) FILTER (WHERE liked IS NOT NULL) as like_total_responses,

          -- Founder feedback stats (ratings)
          COUNT(*) FILTER (WHERE overall_rating IS NOT NULL) as overall_rating_count,
          COUNT(*) FILTER (WHERE concept_rating IS NOT NULL) as concept_rating_count,
          COUNT(*) FILTER (WHERE presentation_rating IS NOT NULL) as presentation_rating_count,
          COUNT(*) FILTER (WHERE recommend_rating = 'yes') as recommend_yes_count,
          COUNT(*) FILTER (WHERE recommend_rating IS NOT NULL) as recommend_total_count,

          -- Text feedback
          COUNT(*) FILTER (WHERE feedback_text IS NOT NULL AND LENGTH(feedback_text) > 0) as text_feedback_count,

          -- Timing stats
          MIN(submitted_at) as first_feedback_at,
          MAX(submitted_at) as last_feedback_at,

          -- Visitor engagement
          COUNT(DISTINCT visitor_id) as unique_respondents,
          COUNT(DISTINCT DATE(submitted_at)) as feedback_days
        FROM event_feedback ef
        WHERE ef.event_id = $1
          AND ef.submitted_at >= $2
          ${typeCondition}
      `, [guide_id, sinceDate]);

      // Get founder rating averages
      const founderAvgsResult = await client.query(`
        SELECT
          AVG(CASE
            WHEN overall_rating = 'excellent' THEN 3
            WHEN overall_rating = 'good' THEN 2
            WHEN overall_rating = 'poor' THEN 1
            ELSE NULL
          END) as avg_overall_rating,
          AVG(CASE
            WHEN concept_rating = 'excellent' THEN 3
            WHEN concept_rating = 'good' THEN 2
            WHEN concept_rating = 'poor' THEN 1
            ELSE NULL
          END) as avg_concept_rating,
          AVG(CASE
            WHEN presentation_rating = 'excellent' THEN 3
            WHEN presentation_rating = 'good' THEN 2
            WHEN presentation_rating = 'poor' THEN 1
            ELSE NULL
          END) as avg_presentation_rating
        FROM event_feedback
        WHERE event_id = $1
          AND feedback_type = 'founder'
          AND submitted_at >= $2
      `, [guide_id, sinceDate]);

      // Get daily feedback breakdown
      const dailyBreakdownResult = await client.query(`
        SELECT
          DATE(submitted_at) as feedback_date,
          COUNT(*) as daily_count,
          COUNT(*) FILTER (WHERE feedback_type = 'guide') as guide_count,
          COUNT(*) FILTER (WHERE feedback_type = 'founder') as founder_count,
          COUNT(*) FILTER (WHERE helpful = true) as daily_helpful,
          COUNT(*) FILTER (WHERE liked = true) as daily_liked
        FROM event_feedback
        WHERE event_id = $1
          AND submitted_at >= $2
          ${typeCondition}
        GROUP BY DATE(submitted_at)
        ORDER BY feedback_date DESC
        LIMIT 30
      `, [guide_id, sinceDate]);

      const stats = statsResult.rows[0];
      const founderAvgs = founderAvgsResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          guide: {
            id: guide.id,
            name: guide.event_name,
            status: guide.status,
            created_at: guide.created_at,
            organizer: {
              id: guide.organizer_id,
              username: guide.organizer_username,
              name: guide.organizer_name
            },
            performance: {
              total_views: parseInt(guide.clicks_count) || 0,
              unique_visitors: parseInt(guide.unique_visitors_count) || 0,
              total_completions: parseInt(guide.completion_count) || 0,
              completion_rate: guide.clicks_count > 0 ?
                (parseInt(guide.completion_count) || 0) / parseInt(guide.clicks_count) : 0
            }
          },
          feedback_overview: {
            total_feedback: parseInt(stats.total_feedback) || 0,
            guide_feedback_count: parseInt(stats.guide_feedback_count) || 0,
            founder_feedback_count: parseInt(stats.founder_feedback_count) || 0,
            unique_respondents: parseInt(stats.unique_respondents) || 0,
            text_feedback_count: parseInt(stats.text_feedback_count) || 0,
            feedback_period: {
              first_feedback_at: stats.first_feedback_at,
              last_feedback_at: stats.last_feedback_at,
              active_feedback_days: parseInt(stats.feedback_days) || 0
            }
          },
          guide_feedback_metrics: {
            helpful_stats: {
              total_responses: parseInt(stats.helpful_total_responses) || 0,
              helpful_count: parseInt(stats.helpful_count) || 0,
              not_helpful_count: parseInt(stats.not_helpful_count) || 0,
              helpful_rate: stats.helpful_total_responses > 0 ?
                parseInt(stats.helpful_count) / parseInt(stats.helpful_total_responses) : 0
            },
            like_stats: {
              total_responses: parseInt(stats.like_total_responses) || 0,
              liked_count: parseInt(stats.liked_count) || 0,
              disliked_count: parseInt(stats.disliked_count) || 0,
              like_rate: stats.like_total_responses > 0 ?
                parseInt(stats.liked_count) / parseInt(stats.like_total_responses) : 0
            }
          },
          founder_feedback_metrics: {
            rating_counts: {
              overall_rating_count: parseInt(stats.overall_rating_count) || 0,
              concept_rating_count: parseInt(stats.concept_rating_count) || 0,
              presentation_rating_count: parseInt(stats.presentation_rating_count) || 0
            },
            rating_averages: {
              avg_overall_rating: parseFloat(founderAvgs.avg_overall_rating) || null,
              avg_concept_rating: parseFloat(founderAvgs.avg_concept_rating) || null,
              avg_presentation_rating: parseFloat(founderAvgs.avg_presentation_rating) || null
            },
            recommendation: {
              recommend_yes_count: parseInt(stats.recommend_yes_count) || 0,
              recommend_total_count: parseInt(stats.recommend_total_count) || 0,
              recommend_rate: stats.recommend_total_count > 0 ?
                parseInt(stats.recommend_yes_count) / parseInt(stats.recommend_total_count) : 0
            }
          },
          recent_feedback: feedbackResult.rows.slice(0, 20).map(f => ({
            id: f.id,
            feedback_type: f.feedback_type,
            liked: f.liked,
            helpful: f.helpful,
            overall_rating: f.overall_rating,
            concept_rating: f.concept_rating,
            presentation_rating: f.presentation_rating,
            recommend_rating: f.recommend_rating,
            feedback_text: f.feedback_text,
            submitted_at: f.submitted_at,
            visitor_info: {
              visitor_id: f.visitor_id,
              device_type: f.device_type,
              browser_name: f.browser_name,
              country_code: f.country_code,
              guide_completed: f.guide_completed
            }
          })),
          daily_breakdown: dailyBreakdownResult.rows.map(day => ({
            date: day.feedback_date,
            total_count: parseInt(day.daily_count) || 0,
            guide_count: parseInt(day.guide_count) || 0,
            founder_count: parseInt(day.founder_count) || 0,
            helpful_count: parseInt(day.daily_helpful) || 0,
            liked_count: parseInt(day.daily_liked) || 0
          })),
          filter_params: {
            days,
            feedback_type,
            since_date: sinceDate,
            total_feedback_entries: feedbackResult.rows.length
          }
        },
        message: `Detailed feedback analytics retrieved for guide "${guide.event_name}"`,
        timestamp: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get guide detailed feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve detailed guide feedback analytics'
    });
  }
});

// =============================================================================
// USER FEEDBACK MANAGEMENT ENDPOINTS
// =============================================================================

// GET /api/v1/admin/feedback/search - Search feedback by user, guide, or criteria
router.get('/feedback/search', [
  authenticateToken,
  requireAdmin,
  expressQuery('visitor_id').optional().isString().withMessage('Visitor ID must be a string'),
  expressQuery('event_id').optional().isUUID().withMessage('Event ID must be a valid UUID'),
  expressQuery('feedback_type').optional().isIn(['guide', 'founder']).withMessage('Feedback type must be guide or founder'),
  expressQuery('start_date').optional().isISO8601().withMessage('Start date must be valid ISO8601 format'),
  expressQuery('end_date').optional().isISO8601().withMessage('End date must be valid ISO8601 format'),
  expressQuery('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
  expressQuery('offset').optional().isInt({ min: 0 }).toInt().withMessage('Offset must be non-negative')
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

    const {
      visitor_id,
      event_id,
      feedback_type,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;

    const client = await getClient();

    // Build dynamic query based on search criteria
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (visitor_id) {
      whereConditions.push(`ef.visitor_id = $${paramIndex}`);
      queryParams.push(visitor_id);
      paramIndex++;
    }

    if (event_id) {
      whereConditions.push(`ef.event_id = $${paramIndex}`);
      queryParams.push(event_id);
      paramIndex++;
    }

    if (feedback_type) {
      whereConditions.push(`ef.feedback_type = $${paramIndex}`);
      queryParams.push(feedback_type);
      paramIndex++;
    }

    if (start_date) {
      whereConditions.push(`ef.submitted_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`ef.submitted_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    queryParams.push(limit, offset);

    const searchQuery = `
      SELECT
        ef.id,
        ef.event_id,
        ef.feedback_type,
        ef.liked,
        ef.helpful,
        ef.overall_rating,
        ef.concept_rating,
        ef.presentation_rating,
        ef.recommend_rating,
        ef.feedback_text,
        ef.submitted_at,
        ef.visitor_id,
        ef.ip_address,
        e.event_name,
        e.status as event_status,
        u.username as organizer_username,
        u.full_name as organizer_name
      FROM event_feedback ef
      LEFT JOIN events e ON ef.event_id = e.id
      LEFT JOIN users u ON e.organizer_id = u.id
      ${whereClause}
      ORDER BY ef.submitted_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await client.query(searchQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM event_feedback ef
      LEFT JOIN events e ON ef.event_id = e.id
      ${whereClause}
    `;

    const countResult = await client.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].total) || 0;

    res.status(200).json({
      success: true,
      data: {
        feedback: result.rows,
        pagination: {
          total: totalCount,
          limit: limit,
          offset: offset,
          pages: Math.ceil(totalCount / limit),
          current_page: Math.floor(offset / limit) + 1
        },
        search_criteria: {
          visitor_id,
          event_id,
          feedback_type,
          start_date,
          end_date
        }
      },
      message: `Found ${result.rows.length} feedback entries`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search feedback data'
    });
  }
});

// DELETE /api/v1/admin/feedback/delete-by-user/:visitor_id - Delete all feedback by visitor ID
router.delete('/feedback/delete-by-user/:visitor_id', [
  authenticateToken,
  requireAdmin,
  param('visitor_id').notEmpty().withMessage('Visitor ID is required')
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

    const { visitor_id } = req.params;
    const adminUserId = req.user.id;

    const client = await getClient();

    await client.query('BEGIN');

    try {
      // First, get count and details of feedback to be deleted for audit
      const preDeleteQuery = `
        SELECT
          ef.id,
          ef.event_id,
          ef.feedback_type,
          ef.submitted_at,
          e.event_name,
          u.username as organizer_username
        FROM event_feedback ef
        LEFT JOIN events e ON ef.event_id = e.id
        LEFT JOIN users u ON e.organizer_id = u.id
        WHERE ef.visitor_id = $1
        ORDER BY ef.submitted_at DESC
      `;

      const preDeleteResult = await client.query(preDeleteQuery, [visitor_id]);
      const feedbackToDelete = preDeleteResult.rows;

      if (feedbackToDelete.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'No feedback found for the specified visitor ID'
        });
      }

      // Delete the feedback
      const deleteResult = await client.query(`
        DELETE FROM event_feedback
        WHERE visitor_id = $1
        RETURNING id, feedback_type, event_id
      `, [visitor_id]);

      // Log the admin action for audit trail
      await client.query(`
        INSERT INTO admin_actions (
          admin_user_id,
          action_type,
          target_type,
          target_id,
          details,
          performed_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        adminUserId,
        'DELETE_USER_FEEDBACK',
        'visitor_feedback',
        visitor_id,
        JSON.stringify({
          deleted_count: deleteResult.rows.length,
          feedback_details: feedbackToDelete.map(f => ({
            id: f.id,
            type: f.feedback_type,
            event_name: f.event_name,
            organizer: f.organizer_username,
            submitted_at: f.submitted_at
          }))
        })
      ]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          deleted_count: deleteResult.rows.length,
          visitor_id: visitor_id,
          deleted_feedback: feedbackToDelete,
          admin_action: {
            performed_by: req.user.username,
            performed_at: new Date().toISOString()
          }
        },
        message: `Successfully deleted ${deleteResult.rows.length} feedback entries for visitor ${visitor_id}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Delete user feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user feedback data'
    });
  }
});

// DELETE /api/v1/admin/feedback/bulk-delete - Bulk delete feedback by criteria
router.delete('/feedback/bulk-delete', [
  authenticateToken,
  requireAdmin,
  expressQuery('visitor_ids').optional().isString().withMessage('Visitor IDs must be comma-separated string'),
  expressQuery('event_id').optional().isUUID().withMessage('Event ID must be valid UUID'),
  expressQuery('feedback_type').optional().isIn(['guide', 'founder']).withMessage('Feedback type must be guide or founder'),
  expressQuery('before_date').optional().isISO8601().withMessage('Before date must be valid ISO8601 format'),
  expressQuery('confirm').isBoolean().toBoolean().withMessage('Confirmation required')
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

    const {
      visitor_ids,
      event_id,
      feedback_type,
      before_date,
      confirm
    } = req.query;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Bulk delete requires explicit confirmation'
      });
    }

    // Require at least one criteria
    if (!visitor_ids && !event_id && !feedback_type && !before_date) {
      return res.status(400).json({
        success: false,
        message: 'At least one deletion criteria must be specified'
      });
    }

    const adminUserId = req.user.id;
    const client = await getClient();

    await client.query('BEGIN');

    try {
      // Build dynamic query for bulk deletion
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (visitor_ids) {
        const visitorIdArray = visitor_ids.split(',').map(id => id.trim());
        whereConditions.push(`visitor_id = ANY($${paramIndex})`);
        queryParams.push(visitorIdArray);
        paramIndex++;
      }

      if (event_id) {
        whereConditions.push(`event_id = $${paramIndex}`);
        queryParams.push(event_id);
        paramIndex++;
      }

      if (feedback_type) {
        whereConditions.push(`feedback_type = $${paramIndex}`);
        queryParams.push(feedback_type);
        paramIndex++;
      }

      if (before_date) {
        whereConditions.push(`submitted_at < $${paramIndex}`);
        queryParams.push(before_date);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get feedback details before deletion for audit
      const preDeleteQuery = `
        SELECT
          ef.id,
          ef.visitor_id,
          ef.event_id,
          ef.feedback_type,
          ef.submitted_at,
          e.event_name
        FROM event_feedback ef
        LEFT JOIN events e ON ef.event_id = e.id
        WHERE ${whereClause}
        ORDER BY ef.submitted_at DESC
      `;

      const preDeleteResult = await client.query(preDeleteQuery, queryParams);
      const feedbackToDelete = preDeleteResult.rows;

      if (feedbackToDelete.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'No feedback found matching the specified criteria'
        });
      }

      // Perform bulk deletion
      const deleteResult = await client.query(`
        DELETE FROM event_feedback
        WHERE ${whereClause}
        RETURNING id
      `, queryParams);

      // Log the admin action
      await client.query(`
        INSERT INTO admin_actions (
          admin_user_id,
          action_type,
          target_type,
          target_id,
          details,
          performed_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        adminUserId,
        'BULK_DELETE_FEEDBACK',
        'feedback_bulk',
        'multiple',
        JSON.stringify({
          criteria: { visitor_ids, event_id, feedback_type, before_date },
          deleted_count: deleteResult.rows.length,
          affected_feedback: feedbackToDelete.length > 100 ?
            `${feedbackToDelete.length} entries (too many to log individually)` :
            feedbackToDelete
        })
      ]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          deleted_count: deleteResult.rows.length,
          deletion_criteria: { visitor_ids, event_id, feedback_type, before_date },
          preview: feedbackToDelete.slice(0, 10), // Show first 10 for preview
          total_matched: feedbackToDelete.length,
          admin_action: {
            performed_by: req.user.username,
            performed_at: new Date().toISOString()
          }
        },
        message: `Successfully deleted ${deleteResult.rows.length} feedback entries`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Bulk delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete feedback data'
    });
  }
});

module.exports = router;