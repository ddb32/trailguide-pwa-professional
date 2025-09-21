import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Modal } from '../common/Modal/Modal';
import { Button } from '../common/Button/Button';
// import { Icon } from '../common/Icon/Icon'; // Unused import

interface FeedbackData {
  feedback_type: 'guide';
  helpful: boolean | null;
  conceptLiked: boolean | null;
  feedback_text: string;
}

interface FeedbackModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  isSubmitting?: boolean;
  guideName?: string;
  isPreviewMode?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen = false,
  onClose,
  onSubmit,
  isSubmitting = false,
  guideName = '',
  isPreviewMode = false
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  
  const [feedback, setFeedback] = useState<FeedbackData>({
    feedback_type: 'guide',
    helpful: null,
    conceptLiked: null,
    feedback_text: ''
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleRatingClick = (type: keyof Pick<FeedbackData, 'helpful' | 'conceptLiked'>, value: boolean) => {
    // Clear error when user interacts with form
    if (submitError) setSubmitError(null);

    setFeedback(prev => ({
      ...prev,
      [type]: prev[type] === value ? null : value // Toggle rating if clicking same value
    }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Clear error when user interacts with form
    if (submitError) setSubmitError(null);

    setFeedback(prev => ({
      ...prev,
      feedback_text: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous errors
    setSubmitError(null);

    // Validate that at least one feedback is provided
    if (feedback.helpful === null && feedback.conceptLiked === null && !feedback.feedback_text.trim()) {
      setSubmitError(t('feedback.error.noFeedbackProvided'));
      return;
    }

    try {
      await onSubmit(feedback);
      // Reset form after successful submission
      setFeedback({
        feedback_type: 'guide',
        helpful: null,
        conceptLiked: null,
        feedback_text: ''
      });
      setSubmitError(null);
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Extract error message for user display
      const errorMessage = error instanceof Error ? error.message : t('feedback.error.generic');
      setSubmitError(errorMessage);
      // Modal stays open so user can retry
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const hasAnyFeedback = feedback.helpful !== null || feedback.conceptLiked !== null || feedback.feedback_text.trim();

  const RatingButton: React.FC<{
    type: 'helpful' | 'conceptLiked';
    value: boolean;
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
      title={t('feedback.completedGuide')}
      size="md"
      showHeader={false}
      className="animate-in slide-in-from-bottom-4 zoom-in-95 duration-300"
    >
      {/* Custom Header with Celebration */}
      <div className="text-center mb-8">
        {/* Preview Mode Notice */}
        {isPreviewMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-blue-700 text-sm font-medium font-hebrew">
              👁️ {t('feedback.previewMode.notice')}
            </div>
          </div>
        )}

        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h3 className="heading-4 text-gray-900 mb-2 font-hebrew">
          {t('feedback.guideFeedback.title')}
        </h3>
        <p className="body-text text-gray-600 font-hebrew">
          {t('feedback.guideFeedback.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Guide Helpful Section */}
        <div>
          <p className="body-text-bold text-gray-700 mb-4 font-hebrew text-center">
            {t('feedback.guideFeedback.wasGuideHelpful')}
          </p>
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RatingButton
              type="helpful"
              value={true}
              icon="✅"
              label={t('feedback.helpful')}
              colorClass="border-blue-500 bg-blue-50 text-blue-700 ring-blue-500/20"
            />
            <RatingButton
              type="helpful"
              value={false}
              icon="❌"
              label={t('feedback.notHelpful')}
              colorClass="border-orange-500 bg-orange-50 text-orange-700 ring-orange-500/20"
            />
          </div>
        </div>

        {/* App Concept Section */}
        <div>
          <p className="body-text-bold text-gray-700 mb-4 font-hebrew text-center">
            {t('feedback.guideFeedback.doYouLikeAppConcept')}
          </p>
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RatingButton
              type="conceptLiked"
              value={true}
              icon="👍"
              label={t('feedback.conceptLiked')}
              colorClass="border-green-500 bg-green-50 text-green-700 ring-green-500/20"
            />
            <RatingButton
              type="conceptLiked"
              value={false}
              icon="👎"
              label={t('feedback.conceptDisliked')}
              colorClass="border-red-500 bg-red-50 text-red-700 ring-red-500/20"
            />
          </div>
        </div>

        {/* Optional Text Feedback */}
        <div>
          <label 
            htmlFor="feedback_text" 
            className="block body-text-bold text-gray-700 mb-3 font-hebrew"
          >
            {t('feedback.additionalComments')} ({t('common.optional')})
          </label>
          <textarea
            id="feedback_text"
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
            placeholder={t('feedback.guideFeedback.commentsPlaceholder')}
          />
          <div className={`mt-2 caption text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            {feedback.feedback_text.length}/1000
          </div>
        </div>

        {/* Error Message Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-red-600 text-sm font-medium font-hebrew mb-2">
              ⚠️ {t('feedback.error.title')}
            </div>
            <div className="text-red-700 text-sm font-hebrew">
              {submitError}
            </div>
          </div>
        )}

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
            {t('feedback.guideFeedback.submitButton')}
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

export default FeedbackModal;