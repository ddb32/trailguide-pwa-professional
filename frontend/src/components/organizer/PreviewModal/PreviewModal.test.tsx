import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewModal } from './PreviewModal';
import { EventPreviewData } from '@/types/events';

// Mock the translation hook
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Simple mock translation function
      const translations: Record<string, string> = {
        'preview.title': 'תצוגה מקדימה',
        'preview.backToEdit': 'חזרה לעריכה',
        'preview.startNavigation': 'התחל הכוונה',
        'preview.stepCounter': `שלב ${params?.current} מתוך ${params?.total}`,
        'common.next': 'הבא',
        'common.previous': 'הקודם',
        'common.complete': 'סיום',
        'errors.previewUnavailable': 'תצוגה מקדימה לא זמינה'
      };
      return translations[key] || key;
    },
    isRTL: true
  })
}));

describe('PreviewModal', () => {
  const mockOnClose = jest.fn();

  const validPreviewData: EventPreviewData = {
    event_name: 'פסטיבל דוגמה',
    steps: [
      {
        step_order: 1,
        description: 'שלב ראשון - הגע לכניסה הראשית',
        image_url: 'https://example.com/image1.jpg',
        image_alt: 'כניסה ראשית'
      },
      {
        step_order: 2,
        description: 'שלב שני - פנה ימינה אל השטח הירוק',
        image_url: 'https://example.com/image2.jpg',
        image_alt: 'שטח ירוק'
      }
    ],
    isValid: true
  };

  const invalidPreviewData: EventPreviewData = {
    event_name: '',
    steps: [],
    isValid: false,
    validationErrors: ['שם האירוע נדרש', 'לפחות שלב אחד נדרש']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders preview modal when open', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    expect(screen.getByText('תצוגה מקדימה')).toBeInTheDocument();
    expect(screen.getByText('פסטיבל דוגמה')).toBeInTheDocument();
    expect(screen.getByText('התחל הכוונה')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PreviewModal
        isOpen={false}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    expect(screen.queryByText('תצוגה מקדימה')).not.toBeInTheDocument();
  });

  it('shows validation errors for invalid data', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={invalidPreviewData}
      />
    );

    expect(screen.getByText('תצוגה מקדימה לא זמינה')).toBeInTheDocument();
    expect(screen.getByText('שם האירוע נדרש')).toBeInTheDocument();
    expect(screen.getByText('לפחות שלב אחד נדרש')).toBeInTheDocument();
  });

  it('navigates through steps correctly', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    // Start navigation
    fireEvent.click(screen.getByText('התחל הכוונה'));

    // Should show first step
    expect(screen.getByText('שלב ראשון - הגע לכניסה הראשית')).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 2')).toBeInTheDocument();

    // Navigate to next step
    fireEvent.click(screen.getByText('הבא'));
    expect(screen.getByText('שלב שני - פנה ימינה אל השטח הירוק')).toBeInTheDocument();
    expect(screen.getByText('שלב 2 מתוך 2')).toBeInTheDocument();

    // Should show "Complete" button on last step
    expect(screen.getByText('סיום')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    // Start navigation
    fireEvent.click(screen.getByText('התחל הכוונה'));

    // Test arrow key navigation
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('שלב 2 מתוך 2')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('שלב 1 מתוך 2')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    fireEvent.click(screen.getByText('חזרה לעריכה'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles escape key to close modal', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows progress bar with correct percentage', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    // Start navigation
    fireEvent.click(screen.getByText('התחל הכוונה'));

    // Check progress bar on first step (50% for step 1 of 2)
    const progressBar = document.querySelector('.bg-primary-500');
    expect(progressBar).toHaveStyle('width: 50%');

    // Navigate to second step
    fireEvent.click(screen.getByText('הבא'));

    // Check progress bar on second step (100% for step 2 of 2)
    expect(progressBar).toHaveStyle('width: 100%');
  });

  it('handles completion flow', () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={mockOnClose}
        previewData={validPreviewData}
      />
    );

    // Start and complete navigation
    fireEvent.click(screen.getByText('התחל הכוונה'));
    fireEvent.click(screen.getByText('הבא')); // Go to step 2
    fireEvent.click(screen.getByText('סיום')); // Complete

    // Should show completion screen
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});