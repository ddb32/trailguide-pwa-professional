import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const Home = () => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass, languageClasses } = useLanguageDirection();
  const navigate = useNavigate();

  const features = [
    {
      icon: '📸',
      title: t('home.features.visual.title'),
      description: t('home.features.visual.description')
    },
    {
      icon: '📱',
      title: t('home.features.mobile.title'), 
      description: t('home.features.mobile.description')
    },
    {
      icon: '🔄',
      title: t('home.features.offline.title'),
      description: t('home.features.offline.description')
    },
    {
      icon: '🇮🇱',
      title: t('home.features.hebrew.title'),
      description: t('home.features.hebrew.description')
    }
  ];

  const howItWorksSteps = [
    {
      number: '1',
      title: t('home.howItWorks.step1.title'),
      description: t('home.howItWorks.step1.description'),
      icon: '📝'
    },
    {
      number: '2', 
      title: t('home.howItWorks.step2.title'),
      description: t('home.howItWorks.step2.description'),
      icon: '🔗'
    },
    {
      number: '3',
      title: t('home.howItWorks.step3.title'),
      description: t('home.howItWorks.step3.description'),
      icon: '🎯'
    }
  ];

  return (
    <div className={`min-h-screen ${languageClasses}`}>
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🧭</span>
              <span className="text-xl font-bold text-blue-600">
                {t('app.name')}
              </span>
            </div>

            {/* Actions */}
            <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
              <Link 
                to="/app/dashboard"
                className="btn btn-primary"
              >
                {t('home.hero.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t('home.hero.title')}
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-blue-100">
              {t('home.hero.subtitle')}
            </p>
            <p className="text-lg mb-8 text-blue-50 max-w-3xl mx-auto leading-relaxed">
              {t('home.hero.description')}
            </p>
            
            <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <Link 
                to="/app/dashboard"
                className="btn bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold"
              >
                {t('home.hero.getStarted')}
              </Link>
              <button className="btn bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg">
                {t('home.hero.learnMore')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.features.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.howItWorks.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {howItWorksSteps.map((step, index) => (
              <div 
                key={index}
                className="text-center"
              >
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white text-xl font-bold rounded-full mb-6">
                  {step.number}
                </div>
                
                {/* Step icon */}
                <div className="text-3xl mb-4">{step.icon}</div>
                
                {/* Step content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('cta.description')}
          </p>
          <Link 
            to="/app/dashboard"
            className="btn bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold"
          >
            {t('home.hero.getStarted')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <span className="text-2xl">🧭</span>
              <span className="text-xl font-bold">{t('app.name')}</span>
            </div>
            <p className="text-gray-400">
              {t('app.description')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;