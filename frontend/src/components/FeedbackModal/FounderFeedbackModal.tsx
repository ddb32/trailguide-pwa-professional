import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Modal } from '../common/Modal/Modal';
import { Button } from '../common/Button/Button';

interface FounderFeedbackData {
  feedback_type: 'founder';
  overall_rating: string | null;
  concept_rating: string | null;
  presentation_rating: string | null;
  recommend_rating: string | null;
  feedback_text: string;
}

interface FounderFeedbackModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (feedback: FounderFeedbackData) => Promise<void>;
  isSubmitting?: boolean;
  guideName?: string;
}

const FounderFeedbackModal: React.FC<FounderFeedbackModalProps> = ({ 
  isOpen = false, 
  onClose, 
  onSubmit, 
  isSubmitting = false,
  guideName = ''
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  
  const [feedback, setFeedback] = useState<FounderFeedbackData>({
    feedback_type: 'founder',
    overall_rating: null,
    concept_rating: null,
    presentation_rating: null,
    recommend_rating: null,
    feedback_text: ''
  });

  const handleRatingClick = (type: keyof Pick<FounderFeedbackData, 'overall_rating' | 'concept_rating' | 'presentation_rating' | 'recommend_rating'>, value: string) => {
    setFeedback(prev => ({
      ...prev,
      [type]: prev[type] === value ? null : value // Toggle rating if clicking same value
    }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(prev => ({
      ...prev,
      feedback_text: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one feedback is provided
    if (!feedback.overall_rating && !feedback.concept_rating && !feedback.presentation_rating && !feedback.recommend_rating && !feedback.feedback_text.trim()) {
      return;
    }
    
    try {
      await onSubmit(feedback);
      // Reset form after successful submission
      setFeedback({
        feedback_type: 'founder',
        overall_rating: null,
        concept_rating: null,
        presentation_rating: null,
        recommend_rating: null,
        feedback_text: ''
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit founder feedback:', error);
      // Error handling is done by parent component
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const hasAnyFeedback = feedback.overall_rating || feedback.concept_rating || feedback.presentation_rating || feedback.recommend_rating || feedback.feedback_text.trim();

  const RatingButton: React.FC<{
    type: 'overall_rating' | 'concept_rating' | 'presentation_rating' | 'recommend_rating';
    value: string;
    icon: string;
    label: string;
    colorClass: string;
  }> = ({ type, value, icon, label, colorClass }) => (
    <button
      type="button"
      onClick={() => handleRatingClick(type, value)}
      className={`
        flex-1 py-4 px-4 rounded-xl border-2 transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${feedback[type] === value
          ? `${colorClass} ring-2 ring-offset-2`
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-medium font-hebrew">{label}</div>
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('feedback.founderFeedback.title')}
      size="md"
      showHeader={false}
      className="animate-in slide-in-from-bottom-4 zoom-in-95 duration-300"
    >
      {/* Custom Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="heading-4 text-gray-900 mb-2 font-hebrew">
          {t('feedback.founderFeedback.title')}
        </h3>
        <p className="body-text text-gray-600 font-hebrew">
          {t('feedback.founderFeedback.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Overall Experience Section */}
        <div>
          <p className="body-text-bold text-gray-700 mb-4 font-hebrew text-center">
            {t('feedback.founderFeedback.overallExperience')}
          </p>
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RatingButton
              type="overall_rating"
              value="excellent"
              icon="🌟"
              label={t('feedback.excellent')}
              colorClass="border-green-500 bg-green-50 text-green-700 ring-green-500/20"
            />
            <RatingButton
              type="overall_rating"
              value="good"
              icon="👍"
              label={t('feedback.good')}
              colorClass="border-blue-500 bg-blue-50 text-blue-700 ring-blue-500/20"
            />
            <RatingButton
              type="overall_rating"
              value="poor"
              icon="👎"
              label={t('feedback.poor')}
              colorClass="border-red-500 bg-red-50 text-red-700 ring-red-500/20"
            />
          </div>
        </div>

        {/* Project Concept Section */}
        <div>
          <p className="body-text-bold text-gray-700 mb-4 font-hebrew text-center">
            {t('feedback.founderFeedback.projectConcept')}
          </p>
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RatingButton
              type="concept_rating"
              value="excellent"
              icon="💡"
              label={t('feedback.excellent')}
              colorClass="border-green-500 bg-green-50 text-green-700 ring-green-500/20"
            />
            <RatingButton
              type="concept_rating"
              value="good"
              icon="👌"
              label={t('feedback.good')}
              colorClass="border-blue-500 bg-blue-50 text-blue-700 ring-blue-500/20"
            />
            <RatingButton
              type="concept_rating"
              value="poor"
              icon="🤔"
              label={t('feedback.poor')}
              colorClass="border-red-500 bg-red-50 text-red-700 ring-red-500/20"
            />
          </div>
        </div>

        {/* Presentation Style Section */}
        <div>
          <p className="body-text-bold text-gray-700 mb-4 font-hebrew text-center">
            {t('feedback.founderFeedback.presentationStyle')}
          </p>
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RatingButton
              type="presentation_rating"
              value="excellent"
              icon="🎨"
              label={t('feedback.excellent')}
              colorClass="border-green-500 bg-green-50 text-green-700 ring-green-500/20"
            />
            <RatingButton
              type="presentation_rating"
              value="good"
              icon="👀"
              label={t('feedback.good')}
              colorClass="border-blue-500 bg-blue-50 text-blue-700 ring-blue-500/20"
            />
            <RatingButton
              type="presentation_rating"
              value="poor"
              icon="📋"
              label={t('feedback.poor')}
              colorClass="border-red-500 bg-red-50 text-red-700 ring-red-500/20"
            />
          </div>
        </div>

        {/* Recommendation Section */}
        <div>
          <p className="body-text-bold text-gray-700 mb-4 font-hebrew text-center">
            {t('feedback.founderFeedback.recommendToOthers')}
          </p>
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RatingButton
              type="recommend_rating"
              value="yes"
              icon="✅"
              label={t('feedback.yes')}
              colorClass="border-green-500 bg-green-50 text-green-700 ring-green-500/20"
            />
            <RatingButton
              type="recommend_rating"
              value="no"
              icon="❌"
              label={t('feedback.no')}
              colorClass="border-red-500 bg-red-50 text-red-700 ring-red-500/20"
            />
          </div>
        </div>

        {/* Optional Text Feedback */}
        <div>
          <label 
            htmlFor="founder_feedback_text" 
            className="block body-text-bold text-gray-700 mb-3 font-hebrew"
          >
            {t('feedback.additionalComments')} ({t('common.optional')})
          </label>
          <textarea
            id="founder_feedback_text"
            value={feedback.feedback_text}
            onChange={handleTextChange}
            rows={4}
            maxLength={1000}
            className={`
              w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 
              resize-none transition-all duration-200 font-hebrew
              ${isRTL ? 'text-right' : 'text-left'}
            `}
            placeholder={t('feedback.founderFeedback.commentsPlaceholder')}
          />
          <div className={`mt-2 caption text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            {feedback.feedback_text.length}/1000
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-4 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            type="button"
            onClick={handleSkip}
            variant="ghost"
            size="lg"
            className="flex-1"
          >
            {t('feedback.skip')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting || !hasAnyFeedback}
            loading={isSubmitting}
            className="flex-1"
          >
            {t('feedback.founderFeedback.submitButton')}
          </Button>
        </div>
      </form>

      {/* Guide Name Reference (subtle) */}
      {guideName && (
        <div className={`mt-6 pt-6 border-t border-gray-100 caption text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('feedback.guideReference')}: {guideName}
        </div>
      )}
    </Modal>
  );
};

export default FounderFeedbackModal;