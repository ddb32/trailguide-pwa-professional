import { renderHook, act } from '@testing-library/react';
import { useEventPreview } from './useEventPreview';
import { EventFormData } from '@/types/events';

// Mock the translation hook
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'createGuide.validation.eventNameRequired': 'שם האירוע נדרש',
        'createGuide.validation.eventNameTooLong': 'שם האירוע ארוך מדי',
        'createGuide.validation.expirationDateRequired': 'תאריך תפוגה נדרש',
        'createGuide.validation.expirationDatePast': 'תאריך התפוגה לא יכול להיות בעבר',
        'createGuide.validation.stepsRequired': 'לפחות שלב אחד נדרש',
        'createGuide.validation.stepDescriptionRequired': 'תיאור השלב נדרש',
        'createGuide.validation.stepDescriptionTooLong': 'תיאור השלב ארוך מדי'
      };
      return translations[key] || key;
    }
  })
}));

describe('useEventPreview', () => {
  const validFormData: EventFormData = {
    event_name: 'פסטיבל דוגמה',
    expiration_date: '2025-12-31T23:59',
    steps: [
      {
        step_order: 1,
        description: 'שלב ראשון',
        image_url: 'https://example.com/image1.jpg',
        image_alt: 'תמונה 1'
      },
      {
        step_order: 2,
        description: 'שלב שני',
        image_url: 'https://example.com/image2.jpg',
        image_alt: 'תמונה 2'
      }
    ]
  };

  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useEventPreview());

    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.previewData.isValid).toBe(false);
  });

  it('should validate form data correctly', () => {
    const { result } = renderHook(() => useEventPreview());

    const validation = result.current.validateEventData(validFormData);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect missing event name', () => {
    const { result } = renderHook(() => useEventPreview());

    const invalidData: EventFormData = {
      ...validFormData,
      event_name: ''
    };

    const validation = result.current.validateEventData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('שם האירוע נדרש');
  });

  it('should detect too long event name', () => {
    const { result } = renderHook(() => useEventPreview());

    const invalidData: EventFormData = {
      ...validFormData,
      event_name: 'א'.repeat(256) // 256 characters
    };

    const validation = result.current.validateEventData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('שם האירוע ארוך מדי');
  });

  it('should detect missing expiration date', () => {
    const { result } = renderHook(() => useEventPreview());

    const invalidData: EventFormData = {
      ...validFormData,
      expiration_date: ''
    };

    const validation = result.current.validateEventData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('תאריך תפוגה נדרש');
  });

  it('should detect past expiration date', () => {
    const { result } = renderHook(() => useEventPreview());

    const invalidData: EventFormData = {
      ...validFormData,
      expiration_date: '2020-01-01T00:00' // Past date
    };

    const validation = result.current.validateEventData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('תאריך התפוגה לא יכול להיות בעבר');
  });

  it('should detect missing steps', () => {
    const { result } = renderHook(() => useEventPreview());

    const invalidData: EventFormData = {
      ...validFormData,
      steps: []
    };

    const validation = result.current.validateEventData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('לפחות שלב אחד נדרש');
  });

  it('should detect missing step descriptions', () => {
    const { result } = renderHook(() => useEventPreview());

    const invalidData: EventFormData = {
      ...validFormData,
      steps: [
        {
          step_order: 1,
          description: '', // Empty description
          image_url: 'https://example.com/image1.jpg'
        }
      ]
    };

    const validation = result.current.validateEventData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(error => error.includes('תיאור השלב נדרש'))).toBe(true);
  });

  it('should open preview with valid data', () => {
    const { result } = renderHook(() => useEventPreview());

    act(() => {
      result.current.openPreview(validFormData);
    });

    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.previewData.isValid).toBe(true);
    expect(result.current.previewData.event_name).toBe('פסטיבל דוגמה');
    expect(result.current.previewData.steps).toHaveLength(2);
  });

  it('should close preview', () => {
    const { result } = renderHook(() => useEventPreview());

    act(() => {
      result.current.openPreview(validFormData);
    });

    expect(result.current.isPreviewOpen).toBe(true);

    act(() => {
      result.current.closePreview();
    });

    expect(result.current.isPreviewOpen).toBe(false);
  });

  it('should sanitize form data on preview', () => {
    const { result } = renderHook(() => useEventPreview());

    const unsafeFormData: EventFormData = {
      ...validFormData,
      event_name: 'פסטיבל<script>alert("xss")</script>',
      steps: [
        {
          step_order: 1,
          description: 'שלב<script>alert("xss")</script>ראשון',
          image_url: 'https://example.com/image1.jpg',
          image_alt: 'תמונה<script>alert("xss")</script>1'
        }
      ]
    };

    act(() => {
      result.current.openPreview(unsafeFormData);
    });

    expect(result.current.previewData.event_name).toBe('פסטיבל');
    expect(result.current.previewData.steps[0].description).toBe('שלבראשון');
  });

  it('should filter out empty steps when sanitizing', () => {
    const { result } = renderHook(() => useEventPreview());

    const formDataWithEmptySteps: EventFormData = {
      ...validFormData,
      steps: [
        {
          step_order: 1,
          description: 'שלב ראשון',
          image_url: 'https://example.com/image1.jpg'
        },
        {
          step_order: 2,
          description: '', // Empty step
          image_url: 'https://example.com/image2.jpg'
        },
        {
          step_order: 3,
          description: 'שלב שלישי',
          image_url: 'https://example.com/image3.jpg'
        }
      ]
    };

    act(() => {
      result.current.openPreview(formDataWithEmptySteps);
    });

    // Should only include non-empty steps and re-order them
    expect(result.current.previewData.steps).toHaveLength(2);
    expect(result.current.previewData.steps[0].description).toBe('שלב ראשון');
    expect(result.current.previewData.steps[1].description).toBe('שלב שלישי');
    expect(result.current.previewData.steps[1].step_order).toBe(2); // Re-ordered
  });
});