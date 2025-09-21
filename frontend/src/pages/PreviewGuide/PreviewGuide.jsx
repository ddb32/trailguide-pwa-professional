import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../services/eventsService';
import { useAuth } from '../../contexts/AuthContext';
import ViewGuide from '../ViewGuide/ViewGuide';

/**
 * PreviewGuide component - Data loading wrapper for organizer preview
 * Loads preview data and renders identical ViewGuide component
 */
const PreviewGuide = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPreviewData = useCallback(async () => {
    if (!id) {
      setError('Invalid guide ID');
      setLoading(false);
      return;
    }

    // Ensure user is authenticated
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👁️ Loading preview data for guide:', id);

      const result = await eventsService.getEventPreview(id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load preview data');
      }

      const eventData = result.data;

      console.log('✅ Preview data loaded successfully:', {
        eventId: eventData.id,
        eventName: eventData.event_name,
        stepsCount: eventData.steps?.length || 0
      });

      // Transform the data to match ViewGuide component expectations
      const transformedGuidance = {
        id: eventData.id,
        name: eventData.event_name,
        description: eventData.metadata?.description || '',
        location: eventData.metadata?.location || '',
        coverImage: eventData.cover_image_url,
        coverImageAlt: eventData.cover_image_alt,
        steps: (eventData.steps || []).map(step => ({
          ...step,
          image: step.image_url,
          wazeLink: step.metadata?.wazeLink || null
        }))
      };

      setPreviewData(transformedGuidance);

    } catch (err) {
      console.error('❌ Preview loading error:', err);
      setError(err.message || 'Failed to load preview');

      // Handle authentication errors
      if (err.message?.includes('Authentication failed')) {
        navigate('/login');
        return;
      }

      // Handle 404 errors - guide not found or access denied
      if (err.message?.includes('404')) {
        setError(t('viewGuide.errors.notFound'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, user, navigate, t]);

  useEffect(() => {
    loadPreviewData();
  }, [loadPreviewData]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="font-bold mb-2">{t('viewGuide.errors.loadFailed')}</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {t('common.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // Render ViewGuide component with preview data (100% identical to end-user experience)
  return previewData ? (
    <ViewGuide isPreviewMode={true} previewData={previewData} />
  ) : null;
};

export default PreviewGuide;