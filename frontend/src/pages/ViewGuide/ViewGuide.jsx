import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const ViewGuide = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { languageClasses, isRTL } = useLanguageDirection();
  
  // Mock guidance data - in real implementation, this would come from an API
  const [guidance, setGuidance] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigationStarted, setIsNavigationStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock guidance steps
  const mockSteps = [
    {
      id: 1,
      image: null,
      description: "Welcome! Start by heading to the main entrance of the event.",
      wazeLink: "https://waze.com/ul/example1",
      actionItems: ["Check your ticket", "Have your ID ready"]
    },
    {
      id: 2,
      image: null,
      description: "Walk straight for 100 meters until you see the big blue sign.",
      wazeLink: "",
      actionItems: ["Keep to the right side", "Watch for other visitors"]
    },
    {
      id: 3,
      image: null,
      description: "Turn left at the blue sign and continue for another 50 meters.",
      wazeLink: "",
      actionItems: ["Look for event staff if you need help"]
    },
    {
      id: 4,
      image: null,
      description: "You've arrived! Welcome to the event area.",
      wazeLink: "",
      actionItems: ["Enjoy your visit!", "Keep your ticket with you"]
    }
  ];

  useEffect(() => {
    // Simulate API call to load guidance data
    setTimeout(() => {
      setGuidance({
        id: id,
        name: `Sample Guidance ${id}`,
        description: "This is a sample guidance for demonstration",
        steps: mockSteps
      });
      setLoading(false);
    }, 1000);
  }, [id]);

  const handleStartNavigation = () => {
    setIsNavigationStarted(true);
    setCurrentStep(0);
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
    setIsNavigationStarted(false);
    setCurrentStep(0);
  };

  const isCompleted = currentStep === guidance?.steps?.length - 1;

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${languageClasses}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!guidance) {
    return (
      <div className={`min-h-screen bg-gray-50 ${languageClasses}`}>
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('errors.guideNotFound')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('errors.notFoundMessage')}
            </p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isNavigationStarted) {
    return (
      <div className={`min-h-screen bg-gray-50 ${languageClasses}`}>
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('guide.viewTitle', { id: guidance.id })}
            </h1>
            <h2 className="text-lg text-gray-800 mb-2">{guidance.name}</h2>
            <p className="text-gray-600 mb-6">{guidance.description}</p>
            
            <div className="mb-6 text-sm text-gray-500">
              {t('guide.step', { current: guidance.steps.length, total: guidance.steps.length })} steps
            </div>
            
            <button 
              onClick={handleStartNavigation}
              className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {t('guide.startNavigation')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = guidance.steps[currentStep];

  return (
    <div className={`min-h-screen bg-gray-50 ${languageClasses}`}>
      <div className="max-w-md mx-auto">
        {/* Header with progress */}
        <div className="bg-white p-4 shadow-sm">
          <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h1 className="text-lg font-semibold text-gray-900">{guidance.name}</h1>
            <button 
              onClick={handleBackToStart}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-sm text-gray-600 mb-3">
            {t('guide.step', { current: currentStep + 1, total: guidance.steps.length })}
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / guidance.steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step content */}
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {/* Step image placeholder */}
            {currentStepData.image ? (
              <img 
                src={currentStepData.image} 
                alt={`Step ${currentStep + 1}`}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📍</div>
                  <p className="text-sm text-gray-500">Step {currentStep + 1}</p>
                </div>
              </div>
            )}

            {/* Step description */}
            <p className={`text-gray-800 text-lg leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {currentStepData.description}
            </p>

            {/* Action items */}
            {currentStepData.actionItems && currentStepData.actionItems.length > 0 && (
              <div className="mb-4">
                <h4 className={`text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Action Items:
                </h4>
                <ul className={`text-sm text-gray-600 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {currentStepData.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className={`${isRTL ? 'ml-2' : 'mr-2'} text-blue-600`}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Waze link */}
            {currentStepData.wazeLink && (
              <a
                href={currentStepData.wazeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
              >
                <svg className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Waze
              </a>
            )}
          </div>

          {/* Navigation buttons */}
          <div className={`flex space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('guide.prevStep')}
            </button>
            
            {isCompleted ? (
              <button
                onClick={handleBackToStart}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                {t('guide.completed')}
              </button>
            ) : (
              <button
                onClick={handleNextStep}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {t('guide.nextStep')}
              </button>
            )}
          </div>

          {/* Completion message */}
          {isCompleted && (
            <div className="mt-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {t('guide.completed')}
              </p>
              <p className="text-gray-600">
                {t('guide.thankYou')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewGuide;