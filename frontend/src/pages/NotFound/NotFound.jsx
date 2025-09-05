import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const NotFound = () => {
  const { t } = useTranslation();
  const { languageClasses } = useLanguageDirection();

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${languageClasses}`}>
      <div className="max-w-md text-center p-6">
        <div className="text-8xl mb-6">🤔</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          404
        </h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {t('errors.notFound')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('errors.notFoundMessage')}
        </p>
        <Link 
          to="/"
          className="btn btn-primary"
        >
          {t('errors.backToHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;