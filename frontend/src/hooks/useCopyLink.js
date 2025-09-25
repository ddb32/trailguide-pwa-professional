import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for copying guide links to clipboard
 * Handles clipboard API with fallback and provides user feedback
 */
export const useCopyLink = () => {
  const { t } = useTranslation();

  /**
   * Copy a guide link to clipboard with status validation
   * @param {string} eventId - UUID of the event/guide
   * @param {string} eventName - Name of the guide for success message
   * @param {string} status - Status of the guide ('draft', 'published', 'active', 'expired', etc.)
   * @param {Function} onPublishRequired - Optional callback when publish is required
   */
  const copyGuideLink = async (eventId, eventName = '', status = '', onPublishRequired = null) => {
    try {
      // **CRITICAL VALIDATION**: Check if guide is published
      const actualStatus = status?.toLowerCase();
      const isPublished = actualStatus === 'published' || actualStatus === 'active';

      if (!isPublished) {
        const statusDisplayName = {
          'draft': t('dashboard.status.draft'),
          'expired': t('dashboard.status.expired'),
          'scheduled': t('dashboard.status.scheduled')
        }[actualStatus] || t('dashboard.status.unpublished');

        console.warn('🚫 Copy link blocked - guide not published:', {
          eventId,
          eventName,
          status: actualStatus,
          isPublished
        });

        // Show specific error message based on status
        let errorMessage;
        if (actualStatus === 'draft') {
          errorMessage = t('dashboard.actions.copyLinkDraftError');
        } else if (actualStatus === 'expired') {
          errorMessage = t('dashboard.actions.copyLinkExpiredError');
        } else if (actualStatus === 'scheduled') {
          errorMessage = t('dashboard.actions.copyLinkScheduledError');
        } else {
          errorMessage = t('dashboard.actions.copyLinkUnpublishedError', { status: statusDisplayName });
        }

        toast.error(errorMessage, {
          duration: 6000,
          position: 'bottom-center',
          style: {
            background: '#EF4444',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            textAlign: 'center'
          }
        });

        // Call the callback if provided (for showing publish options)
        if (onPublishRequired && typeof onPublishRequired === 'function') {
          onPublishRequired(eventId, eventName, actualStatus);
        }

        return { success: false, reason: 'not_published', status: actualStatus };
      }

      // Generate public guide URL
      const guideUrl = `${window.location.origin}/guide/${eventId}`;

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(guideUrl);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = guideUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Failed to copy using fallback method');
        }
      }

      // Show success feedback
      const successMessage = eventName
        ? t('dashboard.actions.linkCopied') + ' - ' + eventName
        : t('dashboard.actions.linkCopied');

      toast.success(successMessage, {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: '#10B981',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500'
        }
      });

      console.log('✅ Successfully copied guide link:', guideUrl);
      return { success: true, url: guideUrl };

    } catch (error) {
      console.error('❌ Failed to copy guide link:', error);

      // Show error feedback
      toast.error(t('dashboard.actions.copyLinkError'), {
        duration: 4000,
        position: 'bottom-center',
        style: {
          background: '#EF4444',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500'
        }
      });

      return { success: false, reason: 'copy_failed', error: error.message };
    }
  };

  return {
    copyGuideLink
  };
};