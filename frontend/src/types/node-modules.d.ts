/**
 * Node modules type declarations for missing packages
 * This file provides TypeScript definitions for external modules
 */

declare module 'react-i18next' {
  import { ReactNode } from 'react';

  export interface TFunction {
    (key: string, options?: any): string;
    (key: string, defaultValue?: string, options?: any): string;
  }

  export interface UseTranslationResponse {
    t: TFunction;
    i18n: {
      language: string;
      changeLanguage: (lang: string) => Promise<void>;
      dir: (lang?: string) => 'ltr' | 'rtl';
      exists: (key: string) => boolean;
      getFixedT: (lng?: string, ns?: string) => TFunction;
    };
    ready: boolean;
  }

  export function useTranslation(namespace?: string | string[]): UseTranslationResponse;

  export interface TransProps {
    i18nKey?: string;
    components?: Record<string, ReactNode>;
    values?: Record<string, any>;
    defaults?: string;
    children?: ReactNode;
    t?: TFunction;
  }

  export const Trans: React.FC<TransProps>;
  export const I18nextProvider: React.FC<{ i18n: any; children: ReactNode }>;
  export const initReactI18next: any;
}

declare module 'i18next' {
  export interface Resource {
    [key: string]: any;
  }

  export interface InitOptions {
    resources?: Record<string, Record<string, Resource>>;
    lng?: string;
    fallbackLng?: string | string[];
    debug?: boolean;
    interpolation?: {
      escapeValue?: boolean;
    };
    detection?: any;
    react?: {
      useSuspense?: boolean;
    };
  }

  export interface i18n {
    init: (options: InitOptions) => Promise<void>;
    use: (plugin: any) => i18n;
    t: (key: string, options?: any) => string;
    changeLanguage: (lang: string) => Promise<void>;
    language: string;
    languages: string[];
    dir: (lang?: string) => 'ltr' | 'rtl';
    exists: (key: string) => boolean;
    getFixedT: (lng?: string, ns?: string) => (key: string, options?: any) => string;
    on: (event: string, listener: (...args: any[]) => void) => void;
    off: (event: string, listener: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
  }

  const i18next: i18n;
  export default i18next;
}

declare module 'i18next-browser-languagedetector' {
  const LanguageDetector: any;
  export default LanguageDetector;
}

declare module 'i18next-http-backend' {
  const Backend: any;
  export default Backend;
}