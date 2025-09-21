import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for copying guide links to clipboard
 * Handles clipboard API with fallback and provides user feedback
 */
export const useCopyLink = () => {
  const { t } = useTranslation();

  /**
   * Copy a guide link to clipboard
   * @param {string} eventId - UUID of the event/guide
   * @param {string} eventName - Name of the guide for success message
   */
  const copyGuideLink = async (eventId, eventName = '') => {
    try {
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
        ? `${t('dashboard.actions.linkCopied')} - ${eventName}`
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
      
      console.log('Successfully copied guide link:', guideUrl);
      
    } catch (error) {
      console.error('Failed to copy guide link:', error);
      
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
    }
  };

  return {
    copyGuideLink
  };
};