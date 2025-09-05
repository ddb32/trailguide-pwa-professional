import { EventFormData } from '@/types/events';

export const generateSampleEventData = (): EventFormData => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    event_name: 'פסטיבל דוגמה - הכוונה לבמה הראשית',
    expiration_date: tomorrow.toISOString().slice(0, 16),
    steps: [
      {
        step_order: 1,
        description: 'הגע לכניסה הראשית של הפסטיבל. חפש את השלט הגדול עם הלוגו הכחול.',
        image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop',
        image_alt: 'כניסה ראשית לפסטיבל עם שלט כחול'
      },
      {
        step_order: 2,
        description: 'לאחר הכניסה, פנה ימינה לכיוון האזור הירוק. תראה עצים גבוהים ומשטח דשא.',
        image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
        image_alt: 'אזור ירוק עם עצים ודשא'
      },
      {
        step_order: 3,
        description: 'המשך ישר לאורך השביל למשך כ-200 מטר עד שתגיע לצומת עם 3 שבילים.',
        image_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop',
        image_alt: 'צומת שבילים ביער'
      },
      {
        step_order: 4,
        description: 'בצומת, קח את השביל השמאלי. תראה שלטי הכוונה כחולים המובילים לבמה.',
        image_url: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop',
        image_alt: 'שלטי הכוונה כחולים'
      },
      {
        step_order: 5,
        description: 'הגעת לבמה הראשית! תראה את הבמה הגדולה עם האורות הצבעוניים.',
        image_url: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&h=600&fit=crop',
        image_alt: 'במה ראשית של פסטיבל עם אורות צבעוניים'
      }
    ]
  };
};