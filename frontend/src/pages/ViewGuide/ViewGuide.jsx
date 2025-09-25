import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { useGuideLanguage } from '../../hooks/useGuideLanguage';
import { useAuth } from '../../contexts/AuthContext';
import { eventsService } from '../../services/eventsService';
import { useVisitorTracking } from '../../hooks/useVisitorTracking';
import { useViewTracking } from '../../contexts/ViewTrackingContext';
import FeedbackModal from '../../components/FeedbackModal/FeedbackModal';
import FounderFeedbackModal from '../../components/FeedbackModal/FounderFeedbackModal';
import LanguageSelector from '../../components/LanguageSelector/LanguageSelector';
import { ZoomableImage } from '../../components/ZoomableImage';

const ViewGuide = ({ isPreviewMode = false, previewData = null }) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { languageClasses, isRTL } = useLanguageDirection();
  const { setGuideLanguage } = useGuideLanguage(id);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Enhanced visitor tracking for accurate analytics
  const {
    trackPageView,
    trackInteraction,
    getHeaders,
    isInitialized: trackingInitialized,
    trackingData,
    isReturningVisitor,
    deviceType
  } = useVisitorTracking({
    autoInit: !isPreviewMode, // Only track for end-users, not organizer previews
    trackPageViews: true,
    trackInteractions: true
  });

  const [guidance, setGuidance] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigationStarted, setIsNavigationStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFounderFeedbackModal, setShowFounderFeedbackModal] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingFounderFeedback, setIsSubmittingFounderFeedback] = useState(false);
  // **BULLETPROOF VIEW TRACKING**: Use global context instead of local state
  const {
    isViewTracked,
    markViewAsTracked,
    isDuplicateRequest,
    getTrackingStats
  } = useViewTracking();
  // **STRICT MODE PROTECTION**: Prevent double execution within same component instance
  const hasLoadedRef = useRef(false);
  // LANGUAGE SWITCHER - TEMPORARILY HIDDEN FOR HEBREW-ONLY SYSTEM
  // Change back to useState(true) to restore multilingual functionality
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState('guide'); // 'guide' or 'founder'
  const [autoFeedbackTriggered, setAutoFeedbackTriggered] = useState(false);
  const feedbackTimerRef = useRef(null);

  // **BULLETPROOF GUIDE LOADING**: Simple, dependency-free approach
  const loadGuideData = useCallback(async () => {
    if (!id) return null;

    console.log('🚀 Loading guide with bulletproof approach:', {
      guideId: id,
      isPreview: isPreviewMode,
      isAuthenticated,
      user: user?.username || 'anonymous'
    });

    const userInfo = { id: user?.id, username: user?.username };

    // Check if this request would be a duplicate
    if (isDuplicateRequest(id, userInfo, 3000)) { // 3-second window
      console.log('🛑 Duplicate request blocked by ViewTrackingContext');
      return null;
    }

    // Check if view already tracked
    if (isViewTracked(id, userInfo)) {
      console.log('🛑 View already tracked in session');
      return null;
    }

    try {
      let result = null;

      // **PREVIEW MODE**: Use provided data
      if (isPreviewMode && previewData) {
        console.log('👁️ Preview mode: Using provided data');
        result = { success: true, data: previewData };
        const mockViewId = `preview-${id}-${Date.now()}`;
        setViewId(mockViewId);
        markViewAsTracked(id, userInfo, mockViewId);
        return result;
      }

      // **PRODUCTION MODE**: Try authenticated first, then public
      if (user && isAuthenticated) {
        console.log('✅ Trying authenticated access (no view count)');
        try {
          result = await eventsService.getEvent(id);
          if (result.success) {
            console.log('✅ Authenticated access successful');
            // Generate mock viewId for organizer testing
            const mockViewId = `organizer-${user.id || user.username}-${id}-${Date.now()}`;
            setViewId(mockViewId);
            markViewAsTracked(id, userInfo, mockViewId);
            return result;
          }
        } catch (authError) {
          console.warn('⚠️ Authenticated access failed, trying public');
        }
      }

      // **PUBLIC ACCESS**: This will increment view count
      console.log('📡 Making public access call (will count view)');
      const headers = trackingInitialized ? getHeaders() : {};
      result = await eventsService.getPublicEvent(id, headers);

      if (result.success) {
        console.log('✅ Public access successful - view counted');
        // Extract viewId from response
        if (result.analytics?.viewId) {
          setViewId(result.analytics.viewId);
        }
        // Mark as tracked to prevent future duplicates
        markViewAsTracked(id, userInfo, result.analytics?.viewId);
        return result;
      }

      return result;

    } catch (error) {
      console.error('❌ Guide loading error:', error);
      return { success: false, error: error.message || 'Failed to load guide' };
    }
  }, [id, isPreviewMode, previewData, user, isAuthenticated, trackingInitialized, getHeaders, isViewTracked, isDuplicateRequest, markViewAsTracked]);

  useEffect(() => {
    const loadGuidanceData = async () => {
      try {
        // **STRICT MODE PROTECTION**: Prevent double execution within same component instance
        if (hasLoadedRef.current) {
          console.log('🛑 Duplicate useEffect call blocked by useRef protection');
          return;
        }
        hasLoadedRef.current = true;

        setLoading(true);

        console.log('🔄 useEffect triggered - loading guide data:', {
          guideId: id,
          trackingStats: getTrackingStats(),
          hasLoadedRef: hasLoadedRef.current
        });

        // Use bulletproof loading function
        const result = await loadGuideData();

        if (!result) {
          console.log('🛑 Load request skipped - view already tracked or duplicate');
          setLoading(false);
          return;
        }

        // Check if the guide has expired and redirect if needed (only for non-preview mode)
        if (!isPreviewMode && !result.success && result.errorType === 'expired') {
          // Only redirect for non-organizer access (public users or auth failed)
          console.log('🔒 Guide expired - redirecting to expired page');
          navigate('/guide/expired', {
            state: {
              event_name: result.eventName,
              expired_at: result.expiredAt
            }
          });
          return;
        }

        if (result.success && result.data) {
          let transformedGuidance;

          if (isPreviewMode) {
            // Preview mode: data is already transformed by PreviewGuide
            console.log('👁️ Using pre-transformed preview data');
            transformedGuidance = result.data;
          } else {
            // Public mode: transform API data to match component expectations
            const eventData = result.data.event || result.data;
            console.log('🔍 Transforming public API response:', {
              hasEvent: !!result.data.event,
              eventDataKeys: Object.keys(eventData),
              stepsCount: eventData.steps?.length || 0,
              hasCoverImageUrl: !!eventData.cover_image_url
            });

            transformedGuidance = {
              id: eventData.id,
              name: eventData.event_name,
              description: eventData.metadata?.description || '',
              location: eventData.metadata?.location || '',
              coverImage: eventData.cover_image_url,
              steps: (eventData.steps || []).map(step => ({
                ...step,
                image: step.image_url,
                wazeLink: step.metadata?.wazeLink || null
              }))
            };
          }

          console.log('✅ Transformed guidance data:', {
            id: transformedGuidance.id,
            name: transformedGuidance.name,
            coverImage: transformedGuidance.coverImage,
            stepsWithImages: transformedGuidance.steps.map(s => ({
              order: s.step_order,
              hasImage: !!s.image,
              imageUrl: s.image,
              hasWazeLink: !!s.wazeLink,
              wazeLink: s.wazeLink
            }))
          });

          setGuidance(transformedGuidance);

          // Capture analytics viewId for feedback submission
          if (result.data?.analytics?.viewId) {
            setViewId(result.data.analytics.viewId);
            console.log('✅ Analytics viewId captured:', result.data.analytics.viewId);
          } else if (result.analytics?.viewId) {
            setViewId(result.analytics.viewId);
            console.log('✅ Analytics viewId captured (direct):', result.analytics.viewId);
          }

          console.log('✅ Guide loaded successfully with images and Waze links');
        } else {
          console.warn('Failed to load guide:', result.error);
          setGuidance(null);
        }
      } catch (error) {
        console.error('Error loading guidance:', error);
        setGuidance(null);
      } finally {
        setLoading(false);
      }
    };

    // Only load data if we have an ID
    if (id) {
      loadGuidanceData();
    }

    // **CLEANUP**: Reset protection ref when component unmounts or ID changes
    return () => {
      hasLoadedRef.current = false;
    };
  }, [id]); // **SIMPLIFIED DEPENDENCIES**: Only depend on ID to prevent re-render loops

  const handleLanguageSelect = (language) => {
    setGuideLanguage(language);
    setShowLanguageSelector(false);
  };

  const handleStartNavigation = () => {
    setIsNavigationStarted(true);
    setCurrentStep(0);
    setShowLanguageSelector(false);
  };

  const handleNextStep = () => {
    if (currentStep < guidance.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBackToStart = () => {
    // Clear auto-feedback timer if active
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
      console.log('⏰ Auto-feedback timer cleared due to navigation back to start');
    }

    setIsNavigationStarted(false);
    setCurrentStep(0);
    setAutoFeedbackTriggered(false); // Reset for potential new completion
    // Important: Do NOT reset viewTracked here to prevent counting redirect as new visit
    console.log('🔄 Navigating back to start - maintaining view tracking state to prevent duplicate count');
  };

  const handleFeedbackComplete = () => {
    // Only close feedback modals, keep user on current step
    setShowFeedbackModal(false);
    setShowFounderFeedbackModal(false);
    // Keep user's current navigation state and step
    console.log('✅ Feedback completed - staying on current step:', currentStep + 1);
  };

  const handleComplete = () => {
    // Clear auto-feedback timer if user manually completes
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
      console.log('⏰ Auto-feedback timer cleared due to manual completion');
    }

    // Show feedback modal for all users - both authenticated and anonymous
    // This allows organizers to test feedback and all users to provide input
    console.log('🎯 Guide completed manually - showing feedback modal for user:', user ? user.username : 'anonymous');
    setAutoFeedbackTriggered(true); // Prevent auto-feedback from triggering later
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    if (!guidance?.id) {
      throw new Error('Guide data is not available for feedback submission');
    }

    setIsSubmittingFeedback(true);
    try {
      // **CRITICAL FIX**: Proper viewId validation and handling
      if (!viewId) {
        console.error('❌ No valid viewId available for feedback submission');
        throw new Error('Unable to submit feedback: No valid session found. Please refresh the page and try again.');
      }

      console.log('📤 Submitting feedback with valid viewId:', {
        guideId: guidance.id,
        viewId: viewId,
        userType: user ? 'authenticated' : 'anonymous',
        isPreviewMode: isPreviewMode,
        hasHelpful: feedbackData.helpful !== null && feedbackData.helpful !== undefined,
        hasConceptLiked: feedbackData.conceptLiked !== null && feedbackData.conceptLiked !== undefined,
        hasTextFeedback: !!feedbackData.feedback_text
      });

      // Handle preview mode feedback (simulate success without API call)
      if (isPreviewMode && viewId.startsWith('preview-')) {
        console.log('👁️ Preview mode feedback simulation - not sending to API:', feedbackData);
        // Simulate API delay for realistic testing
        await new Promise(resolve => setTimeout(resolve, 1000));
        var result = {
          success: true,
          data: {
            feedbackId: `preview-feedback-${Date.now()}`,
            submittedAt: new Date().toISOString()
          }
        };
      } else {
        // Submit feedback with proper validation for real sessions
        var result = await eventsService.submitFeedback(guidance.id, viewId, feedbackData);
      }

      console.log('✅ Guide feedback submitted successfully:', {
        success: result.success,
        feedbackId: result.data?.feedbackId,
        submittedAt: result.data?.submittedAt,
        userType: user ? 'authenticated' : 'anonymous',
        viewId: viewId
      });

      // **ONLY proceed with UI changes if submission was successful**
      if (result.success) {
        // Only show founder feedback for anonymous users (30% chance)
        const shouldShowFounderFeedback = !user && Math.random() < 0.3;
        if (shouldShowFounderFeedback) {
          console.log('🚀 Anonymous user randomly selected for founder feedback');
          // Close guide feedback modal and show founder feedback
          setShowFeedbackModal(false);
          setShowFounderFeedbackModal(true);
        } else {
          // If no founder feedback, close modal and stay on current step
          console.log('🔄 Feedback submitted successfully - staying on current step');
          handleFeedbackComplete();
        }
        return true;
      } else {
        throw new Error(result.message || 'Feedback submission failed');
      }
    } catch (error) {
      console.error('❌ Failed to submit guide feedback:', error);

      // Handle specific error types
      if (error.message.includes('already been submitted')) {
        throw new Error('You have already provided feedback for this guide. Thank you!');
      } else if (error.message.includes('Event view not found')) {
        throw new Error('Session expired. Please refresh the page and try again.');
      } else if (error.message.includes('viewId')) {
        throw new Error('Invalid session. Please refresh the page and try again.');
      }

      // Re-throw the error to be handled by the UI
      throw error;
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleFounderFeedbackSubmit = async (feedbackData) => {
    if (!guidance?.id) {
      throw new Error('Guide data is not available for feedback submission');
    }

    setIsSubmittingFounderFeedback(true);
    try {
      // **CRITICAL FIX**: Proper viewId validation for founder feedback too
      if (!viewId) {
        console.error('❌ No valid viewId available for founder feedback submission');
        throw new Error('Unable to submit feedback: No valid session found. Please refresh the page and try again.');
      }

      console.log('📤 Submitting founder feedback with valid viewId:', {
        guideId: guidance.id,
        viewId: viewId,
        userType: user ? 'authenticated' : 'anonymous'
      });

      // Submit founder feedback with proper validation
      const result = await eventsService.submitFeedback(guidance.id, viewId, feedbackData);

      console.log('✅ Founder feedback submitted successfully:', {
        success: result.success,
        feedbackId: result.data?.feedbackId,
        submittedAt: result.data?.submittedAt,
        userType: user ? 'authenticated' : 'anonymous'
      });

      // **ONLY proceed with UI changes if submission was successful**
      if (result.success) {
        // Close founder feedback modal and stay on current step
        console.log('🔄 Founder feedback submitted successfully - staying on current step');
        handleFeedbackComplete();
        return true;
      } else {
        throw new Error(result.message || 'Founder feedback submission failed');
      }
    } catch (error) {
      console.error('❌ Failed to submit founder feedback:', error);

      // Handle specific error types
      if (error.message.includes('already been submitted')) {
        throw new Error('You have already provided feedback for this guide. Thank you!');
      } else if (error.message.includes('Event view not found')) {
        throw new Error('Session expired. Please refresh the page and try again.');
      } else if (error.message.includes('viewId')) {
        throw new Error('Invalid session. Please refresh the page and try again.');
      }

      // Re-throw the error to be handled by the UI
      throw error;
    } finally {
      setIsSubmittingFounderFeedback(false);
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    // If user closes feedback without submitting, redirect back to start
    console.log('🔄 Feedback modal closed - redirecting to guide start');
    handleBackToStart();
  };

  const handleFounderFeedbackClose = () => {
    setShowFounderFeedbackModal(false);
    // If user closes founder feedback without submitting, redirect back to start
    console.log('🔄 Founder feedback modal closed - redirecting to guide start');
    handleBackToStart();
  };

  const isCompleted = currentStep === guidance?.steps?.length - 1;

  // Automatic feedback timer when user reaches final step
  useEffect(() => {
    if (isCompleted && !autoFeedbackTriggered && !showFeedbackModal && guidance?.steps?.length > 0) {
      // Generate random timeout between 5-7 seconds (5000-7000ms)
      const randomDelay = Math.floor(Math.random() * 2000) + 5000;

      console.log(`⏰ Auto-feedback timer started: ${randomDelay}ms delay for final step`);

      feedbackTimerRef.current = setTimeout(() => {
        console.log('🎯 Auto-feedback triggered after timer completion');
        setAutoFeedbackTriggered(true);
        setShowFeedbackModal(true);
      }, randomDelay);
    }

    // Cleanup timer if component unmounts or conditions change
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [isCompleted, autoFeedbackTriggered, showFeedbackModal, guidance?.steps?.length]);

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center ${languageClasses}`}>
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-sm mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('viewGuide.loading.title')}</h2>
          <p className="text-gray-600">{t('viewGuide.loading.message')}</p>
        </div>
      </div>
    );
  }

  if (!guidance) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-orange-50 flex items-center justify-center ${languageClasses}`}>
        <div className="max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl sm:text-7xl mb-6 opacity-80">🔍</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              {t('viewGuide.error.notFound')}
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {t('viewGuide.error.notFoundMessage')}
            </p>
            <button 
              onClick={() => window.history.back()}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {t('viewGuide.error.goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isNavigationStarted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 ${languageClasses}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Compact main card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="lg:grid lg:grid-cols-5 lg:gap-0">

              {/* Compact Cover Image Section */}
              <div className={`lg:col-span-2 relative ${isRTL && 'lg:order-2'}`}>
                {guidance.coverImage ? (
                  <div className="w-full h-64 sm:h-72 lg:h-full lg:min-h-[320px] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    <ZoomableImage
                      src={guidance.coverImage}
                      alt={guidance.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
                      containerClassName="h-full"
                      enableMobileOptimization={true}
                      onError={(e) => {
                        console.error('❌ Failed to load cover image:', {
                          url: guidance.coverImage,
                          error: e,
                          guideName: guidance.name
                        });
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) {
                          e.target.nextElementSibling.style.display = 'flex';
                        }
                      }}
                      onLoad={() => {
                        console.log('✅ Cover image loaded successfully:', guidance.coverImage);
                      }}
                    />
                    {/* Compact fallback for failed cover images */}
                    <div className="hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2 opacity-60">🗺️</div>
                        <p className="text-sm text-gray-600 font-medium">{t('viewGuide.images.guideCover')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Compact placeholder when no cover image */
                  <div className="w-full h-64 sm:h-72 lg:h-full lg:min-h-[320px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-4xl mb-2 opacity-70">🗺️</div>
                      <p className="text-sm text-gray-700 font-medium">{t('viewGuide.images.visualGuide')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('viewGuide.images.stepByStepNavigation')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Content Section */}
              <div className={`lg:col-span-3 flex flex-col justify-center p-6 lg:p-8 ${isRTL && 'lg:order-1'}`}>
                <div className="space-y-4">

                  {/* Optimized title and description */}
                  <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                      {guidance.name}
                    </h1>

                    {guidance.description && (
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                        {guidance.description}
                      </p>
                    )}

                    {/* Compact step count display */}
                    <div className="flex items-center justify-center lg:justify-start space-x-2 mb-4">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {t('viewGuide.welcome.stepsTotal', { count: guidance.steps.length })}
                      </span>
                    </div>
                  </div>

                  {/* Language Selector */}
                  {showLanguageSelector && (
                    <div className="mb-4">
                      <LanguageSelector
                        onLanguageSelect={handleLanguageSelect}
                        className="bg-gray-50 rounded-lg shadow-sm p-4 border border-gray-100"
                      />
                    </div>
                  )}

                  {/* Compact start button */}
                  <div className="space-y-3">
                    <button
                      onClick={handleStartNavigation}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base sm:text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-3 focus:ring-blue-300 transform hover:scale-[1.02] transition-all duration-200 shadow-md"
                    >
                      {t('viewGuide.welcome.startNavigation')}
                    </button>

                    {/* Compact features preview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 text-gray-600 bg-green-50 rounded-lg p-2">
                        <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">{t('viewGuide.welcome.features.visualSteps')}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-gray-600 bg-purple-50 rounded-lg p-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">{t('viewGuide.welcome.features.turnByTurn')}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Compact additional guide info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {t('viewGuide.welcome.tip')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = guidance.steps[currentStep];

  return (
    <div className={`min-h-screen bg-slate-50 ${languageClasses}`}>

      {/* Compact Header with progress */}
      <div className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {guidance.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                {t('viewGuide.navigation.stepProgress', { current: currentStep + 1, total: guidance.steps.length })}
              </p>
            </div>
            <button
              onClick={handleBackToStart}
              className="ml-3 text-gray-500 hover:text-gray-700 focus:outline-none p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close guide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Compact Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / guidance.steps.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Compact responsive step content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="lg:grid lg:grid-cols-5 lg:gap-6">

          {/* Compact Image Section */}
          <div className={`lg:col-span-2 ${isRTL && 'lg:order-2'}`}>
            <div className="sticky top-20">
              {currentStepData.image ? (
                <div className="w-full h-72 sm:h-80 lg:h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden shadow-md">
                  <ZoomableImage
                    src={currentStepData.image}
                    alt={`Step ${currentStep + 1} - ${currentStepData.description?.slice(0, 50) || 'Guide step'}`}
                    className="w-full h-full object-cover transition-all duration-300 hover:scale-[1.02]"
                    containerClassName="h-full"
                    enableMobileOptimization={true}
                    onError={(e) => {
                      console.error('❌ Failed to load step image:', currentStepData.image);
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                    onLoad={() => {
                      console.log('✅ Step image loaded successfully:', currentStepData.image);
                    }}
                  />
                  {/* Compact fallback for failed images */}
                  <div className="hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2 opacity-60">🖼️</div>
                      <p className="text-sm text-gray-600 font-medium">{t('viewGuide.images.visualGuideStep', { number: currentStep + 1 })}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('viewGuide.images.imageTemporarilyUnavailable')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact placeholder for steps without images */
                <div className="w-full h-72 sm:h-80 lg:h-96 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg flex items-center justify-center shadow-md">
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2 opacity-70">📍</div>
                    <p className="text-sm text-gray-700 font-medium">{t('viewGuide.welcome.stepSingular')} {currentStep + 1}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('viewGuide.images.visualGuide')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact Content Section */}
          <div className={`lg:col-span-3 mt-4 lg:mt-0 ${isRTL && 'lg:order-1'}`}>
            <div className="space-y-4">

              {/* Compact step description */}
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
                <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('viewGuide.welcome.stepSingular')} {currentStep + 1}
                </h2>

                <p className={`text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {currentStepData.description}
                </p>

                {/* Compact Action items */}
                {currentStepData.actionItems && currentStepData.actionItems.length > 0 && (
                  <div className="mb-4">
                    <h4 className={`text-sm font-semibold text-gray-800 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('viewGuide.navigation.actionItems')}
                    </h4>
                    <ul className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentStepData.actionItems.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className={`${isRTL ? 'ml-2' : 'mr-2'} text-blue-600 text-sm font-bold mt-0.5`}>•</span>
                          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compact Waze link */}
                {currentStepData.wazeLink && (
                  <a
                    href={currentStepData.wazeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                  >
                    <svg className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    {t('viewGuide.navigation.openInNavigation')}
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Compact Mobile Navigation */}
        <div className="mt-4 lg:mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <div className={`flex space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {t('viewGuide.navigation.previous')}
              </button>

              {isCompleted ? (
                <button
                  onClick={handleComplete}
                  className="flex-1 px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-200 transform hover:scale-[1.02] shadow-sm"
                >
                  {t('viewGuide.navigation.completeGuide')}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  className="flex-1 px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02] shadow-sm"
                >
                  {t('viewGuide.navigation.nextStep')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal - only for public users */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
        isSubmitting={isSubmittingFeedback}
        guideName={guidance?.name || ''}
        isPreviewMode={isPreviewMode}
      />

      {/* Founder Feedback Modal - randomly shown after guide feedback */}
      <FounderFeedbackModal
        isOpen={showFounderFeedbackModal}
        onClose={handleFounderFeedbackClose}
        onSubmit={handleFounderFeedbackSubmit}
        isSubmitting={isSubmittingFounderFeedback}
      />
    </div>
  );
};

export default ViewGuide;