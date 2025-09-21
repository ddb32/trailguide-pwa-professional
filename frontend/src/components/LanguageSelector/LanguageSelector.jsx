import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const LanguageSelector = ({ onLanguageSelect, className = '' }) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    setIsOpen(false);
    if (onLanguageSelect) {
      onLanguageSelect(language);
    }
  };

  const languages = [
    { code: 'he', name: t('viewGuide.languageSelector.hebrew'), flag: '🇮🇱' },
    { code: 'en', name: t('viewGuide.languageSelector.english'), flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className={`relative ${className}`}>
      {/* Language Selection Title */}
      <div className={`text-center mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {t('viewGuide.languageSelector.title')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('viewGuide.languageSelector.subtitle')}
        </p>
      </div>

      {/* Language Toggle Buttons */}
      <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-2 bg-gray-100 rounded-xl p-2`}>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              i18n.language === language.code
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span className={`text-lg ${isRTL ? 'ml-2' : 'mr-2'}`}>{language.flag}</span>
            <span>{language.name}</span>
          </button>
        ))}
      </div>

      {/* Continue Hint */}
      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">
          {t('viewGuide.languageSelector.continue')}
        </p>
      </div>
    </div>
  );
};

export default LanguageSelector;