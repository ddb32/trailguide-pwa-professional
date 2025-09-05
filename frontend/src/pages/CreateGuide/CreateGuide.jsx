import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { eventsService } from '../../services/eventsService';
import { useEvents } from '../../hooks/useEvents';
import ImageUpload from '../../components/ImageUpload';

const CreateGuide = () => {
  const { t } = useTranslation();
  const { languageClasses, isRTL } = useLanguageDirection();
  const navigate = useNavigate();
  const { refreshEvents } = useEvents();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [steps, setSteps] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      event_name: '',
      description: '',
      location: '',
      status: 'draft'
    }
  });

  // Watch form values for character counting
  const eventName = watch('event_name');
  const description = watch('description');
  const location = watch('location');

  const handleImageSelect = (file, error) => {
    setImageError(error);
    if (!error) {
      setImageFile(file);
    }
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImageError(null);
  };

  // Step management functions
  const addStep = () => {
    const newStep = {
      id: Date.now(),
      image: null,
      description: '',
      wazeLink: '',
      actionItems: []
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const updateStep = (stepId, field, value) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  };

  const reorderSteps = (dragIndex, hoverIndex) => {
    const dragStep = steps[dragIndex];
    const newSteps = [...steps];
    newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, dragStep);
    setSteps(newSteps);
  };

  const onSubmit = async (data) => {
    if (isSubmitting) return;

    // Validate image if present
    if (imageError) {
      toast.error(imageError, { 
        duration: 4000,
        style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submitData = {
        event_name: data.event_name.trim(),
        description: data.description?.trim() || '',
        location: data.location?.trim() || '',
        status: data.status,
        coverImage: imageFile
      };

      // Submit to API
      const result = await eventsService.createEventWithImage(submitData);

      if (result.success) {
        // Show success message
        toast.success(t('createGuide.form.messages.createSuccess'), {
          duration: 3000,
          style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
        });

        // Refresh events list
        try {
          await refreshEvents();
        } catch (refreshError) {
          console.warn('Failed to refresh events list:', refreshError);
          // Don't block the success flow if refresh fails
        }

        // Navigate back to dashboard
        navigate('/app/dashboard');
      }

    } catch (error) {
      console.error('Create event error:', error);
      
      let errorMessage = t('createGuide.form.messages.createError');
      
      // Handle specific error types
      if (error.message.includes('Authentication required') || error.message.includes('Access token required')) {
        errorMessage = t('auth.loginError', 'Please log in to create guidance');
        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (error.message.includes('already exists')) {
        errorMessage = t('createGuide.form.messages.nameExists');
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = t('createGuide.form.messages.networkError');
      } else if (error.message.includes('image') || error.message.includes('file')) {
        errorMessage = t('createGuide.form.messages.uploadError');
      }

      toast.error(errorMessage, {
        duration: 5000,
        style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className={`space-y-8 ${languageClasses}`}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('createGuide.title')}
        </h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {t('createGuide.basicInfo.title')}
            </h2>
            
            {/* Event Name - Required */}
            <div>
              <label 
                htmlFor="event_name" 
                className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('createGuide.basicInfo.eventName')} *
              </label>
              <input
                id="event_name"
                type="text"
                {...register('event_name', {
                  required: t('createGuide.form.validation.eventNameRequired'),
                  maxLength: {
                    value: 255,
                    message: t('createGuide.form.validation.eventNameTooLong')
                  },
                  validate: value => value.trim().length > 0 || t('createGuide.form.validation.eventNameRequired')
                })}
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.event_name ? 'border-red-300' : 'border-gray-300'}
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
                placeholder={t('createGuide.basicInfo.eventNamePlaceholder')}
                disabled={isSubmitting}
              />
              <div className={`mt-1 flex justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                {errors.event_name && (
                  <p className="text-sm text-red-600">{errors.event_name.message}</p>
                )}
                <span className={`text-xs text-gray-500 ${isRTL ? 'ml-auto' : 'mr-auto'}`}>
                  {eventName?.length || 0}/255
                </span>
              </div>
            </div>

            {/* Description - Optional */}
            <div>
              <label 
                htmlFor="description" 
                className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('createGuide.basicInfo.description')}
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description', {
                  maxLength: {
                    value: 1000,
                    message: t('createGuide.form.validation.descriptionTooLong')
                  }
                })}
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical
                  ${errors.description ? 'border-red-300' : 'border-gray-300'}
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
                placeholder={t('createGuide.basicInfo.descriptionPlaceholder')}
                disabled={isSubmitting}
              />
              <div className={`mt-1 flex justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
                <span className={`text-xs text-gray-500 ${isRTL ? 'ml-auto' : 'mr-auto'}`}>
                  {description?.length || 0}/1000
                </span>
              </div>
            </div>

            {/* Location - Optional */}
            <div>
              <label 
                htmlFor="location" 
                className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {t('createGuide.basicInfo.location')}
              </label>
              <input
                id="location"
                type="text"
                {...register('location', {
                  maxLength: {
                    value: 255,
                    message: t('createGuide.form.validation.locationTooLong')
                  }
                })}
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.location ? 'border-red-300' : 'border-gray-300'}
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
                placeholder={t('createGuide.basicInfo.locationPlaceholder')}
                disabled={isSubmitting}
              />
              <div className={`mt-1 flex justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                {errors.location && (
                  <p className="text-sm text-red-600">{errors.location.message}</p>
                )}
                <span className={`text-xs text-gray-500 ${isRTL ? 'ml-auto' : 'mr-auto'}`}>
                  {location?.length || 0}/255
                </span>
              </div>
            </div>

            {/* Status - Required */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('createGuide.basicInfo.status')}
              </label>
              <div className={`flex space-x-6 ${isRTL ? 'space-x-reverse' : ''}`}>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    {...register('status')}
                    value="draft"
                    className={`form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${isRTL ? 'ml-2' : 'mr-2'}`}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">{t('createGuide.status.draft')}</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    {...register('status')}
                    value="published"
                    className={`form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${isRTL ? 'ml-2' : 'mr-2'}`}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">{t('createGuide.status.published')}</span>
                </label>
              </div>
            </div>

            {/* Cover Image - Optional */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('createGuide.basicInfo.coverImage')}
              </label>
              <ImageUpload
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                error={imageError}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Guidance Steps Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('createGuide.steps.title')}
              </h2>
              <button
                type="button"
                onClick={addStep}
                disabled={isSubmitting}
                className={`px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <span className={`${isRTL ? 'ml-2' : 'mr-2'}`}>+</span>
                {t('createGuide.steps.addStep')}
              </button>
            </div>

            {/* Steps List */}
            {steps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📍</div>
                <p className="text-sm">
                  {t('createGuide.steps.noStepsYet')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className="text-sm font-medium text-gray-700">
                        {t('createGuide.steps.stepNumber', { number: index + 1 })}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-800 focus:outline-none p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Step Image */}
                      <div>
                        <label className={`block text-xs font-medium text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('createGuide.steps.uploadImage')}
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors">
                          {step.image ? (
                            <div className="relative">
                              <img 
                                src={URL.createObjectURL(step.image)} 
                                alt={`Step ${index + 1}`}
                                className="w-full h-32 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => updateStep(step.id, 'image', null)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="py-4">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) updateStep(step.id, 'image', file);
                                }}
                                className="hidden"
                                id={`step-image-${step.id}`}
                              />
                              <label 
                                htmlFor={`step-image-${step.id}`}
                                className="cursor-pointer text-sm text-gray-600 hover:text-gray-800"
                              >
                                <div className="text-2xl mb-1">📷</div>
                                Click to add image
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step Description */}
                      <div>
                        <label className={`block text-xs font-medium text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('createGuide.steps.stepDescription')}
                        </label>
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                          placeholder={t('createGuide.steps.stepPlaceholder')}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                          rows={2}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Optional Waze Link */}
                      <div>
                        <label className={`block text-xs font-medium text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Waze Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={step.wazeLink}
                          onChange={(e) => updateStep(step.id, 'wazeLink', e.target.value)}
                          placeholder="https://waze.com/ul/..."
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className={`flex space-x-4 pt-6 border-t border-gray-200 ${isRTL ? 'space-x-reverse' : ''}`}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !isValid || imageError}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting && (
                <svg className={`animate-spin h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmitting ? t('createGuide.form.creating') : t('createGuide.form.createEvent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGuide;