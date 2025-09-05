export interface Step {
  id: string;
  step_order: number;
  description: string;
  image_url?: string;
  image_alt?: string;
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  event_name: string;
  status: 'draft' | 'published' | 'expired';
  expiration_date: string;
  created_at: string;
  updated_at: string;
  steps: Step[];
}

export interface CreateEventData {
  event_name: string;
  expiration_date: string;
  steps: CreateStepData[];
}

export interface CreateStepData {
  step_order: number;
  description: string;
  image_url?: string;
  image_alt?: string;
}

export interface PublicEvent {
  id: string;
  event_name: string;
  status: 'published';
  expiration_date: string;
  steps: Step[];
}

export interface EventPreviewData {
  event_name: string;
  steps: CreateStepData[];
  isValid: boolean;
  validationErrors?: string[];
}

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: EventPreviewData;
}

export interface EventFormData {
  event_name: string;
  expiration_date: string;
  steps: CreateStepData[];
}