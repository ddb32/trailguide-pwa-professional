-- =============================================================================
-- TrailGuide PWA - Dual Feedback System
-- Version: 013
-- Description: Add support for guide-level and founder-level feedback types
-- =============================================================================

-- Add feedback_type column to event_feedback table
ALTER TABLE event_feedback ADD COLUMN feedback_type VARCHAR(20) NOT NULL DEFAULT 'guide';

COMMENT ON COLUMN event_feedback.feedback_type IS 'Type of feedback: guide (specific guide quality) or founder (overall project concept)';

-- Create constraint to ensure valid feedback types
ALTER TABLE event_feedback DROP CONSTRAINT IF EXISTS check_feedback_type;
ALTER TABLE event_feedback ADD CONSTRAINT check_feedback_type 
  CHECK (feedback_type IN ('guide', 'founder'));

-- Update existing feedback to be guide-level feedback
UPDATE event_feedback SET feedback_type = 'guide' WHERE feedback_type IS NULL OR feedback_type = 'guide';

-- Add fields for founder feedback ratings
ALTER TABLE event_feedback ADD COLUMN overall_rating VARCHAR(20);
ALTER TABLE event_feedback ADD COLUMN concept_rating VARCHAR(20);
ALTER TABLE event_feedback ADD COLUMN presentation_rating VARCHAR(20);
ALTER TABLE event_feedback ADD COLUMN recommend_rating VARCHAR(20);

COMMENT ON COLUMN event_feedback.overall_rating IS 'Overall experience rating for founder feedback: excellent, good, poor';
COMMENT ON COLUMN event_feedback.concept_rating IS 'Project concept rating for founder feedback: excellent, good, poor';
COMMENT ON COLUMN event_feedback.presentation_rating IS 'Presentation style rating for founder feedback: excellent, good, poor';
COMMENT ON COLUMN event_feedback.recommend_rating IS 'Recommendation to others for founder feedback: yes, no';

-- Add constraints for founder feedback rating values
ALTER TABLE event_feedback ADD CONSTRAINT check_overall_rating 
  CHECK (overall_rating IS NULL OR overall_rating IN ('excellent', 'good', 'poor'));

ALTER TABLE event_feedback ADD CONSTRAINT check_concept_rating 
  CHECK (concept_rating IS NULL OR concept_rating IN ('excellent', 'good', 'poor'));

ALTER TABLE event_feedback ADD CONSTRAINT check_presentation_rating 
  CHECK (presentation_rating IS NULL OR presentation_rating IN ('excellent', 'good', 'poor'));

ALTER TABLE event_feedback ADD CONSTRAINT check_recommend_rating 
  CHECK (recommend_rating IS NULL OR recommend_rating IN ('yes', 'no'));

-- Create indexes for efficient querying by feedback type
CREATE INDEX idx_event_feedback_type ON event_feedback(feedback_type);
CREATE INDEX idx_event_feedback_type_event ON event_feedback(feedback_type, event_id);
CREATE INDEX idx_event_feedback_type_submitted ON event_feedback(feedback_type, submitted_at DESC);

-- Update feedback content validation constraint
ALTER TABLE event_feedback DROP CONSTRAINT IF EXISTS check_feedback_content;
ALTER TABLE event_feedback ADD CONSTRAINT check_feedback_content 
  CHECK (
    -- Guide feedback must have at least liked, helpful, or text
    (feedback_type = 'guide' AND (liked IS NOT NULL OR helpful IS NOT NULL OR (feedback_text IS NOT NULL AND length(trim(feedback_text)) > 0))) OR
    -- Founder feedback must have at least one rating or text
    (feedback_type = 'founder' AND (overall_rating IS NOT NULL OR concept_rating IS NOT NULL OR presentation_rating IS NOT NULL OR recommend_rating IS NOT NULL OR (feedback_text IS NOT NULL AND length(trim(feedback_text)) > 0)))
  );

COMMENT ON CONSTRAINT check_feedback_content ON event_feedback IS 'Ensures appropriate feedback fields are provided based on feedback type';

-- =============================================================================
-- ANALYTICS ENHANCEMENT VIEWS
-- =============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS feedback_analytics_view;

-- Create comprehensive dual feedback analytics view
CREATE VIEW feedback_analytics_view AS
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
    
    -- Event information
    e.event_name,
    e.status AS event_status,
    e.organizer_id,
    org.username AS organizer_username,
    org.full_name AS organizer_name,
    
    -- Analytics metadata
    ef.visitor_id,
    ef.ip_address,
    ef.user_agent
    
FROM event_feedback ef
LEFT JOIN events e ON ef.event_id = e.id
LEFT JOIN users org ON e.organizer_id = org.id
ORDER BY ef.submitted_at DESC;

COMMENT ON VIEW feedback_analytics_view IS 'Comprehensive dual feedback analytics with event and organizer details for both guide and founder feedback types';

-- =============================================================================
-- UPDATE TABLE COMMENT
-- =============================================================================

COMMENT ON TABLE event_feedback IS 'Dual feedback collection: guide-level feedback for specific guide quality and founder-level feedback for overall TrailGuide concept and approach';