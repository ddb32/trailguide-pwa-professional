const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en', // default language

    backend: {
      loadPath: __dirname + '/../locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['querystring', 'header'],
      lookupQuerystring: 'lang',
      lookupHeader: 'accept-language',
      caches: false
    },

    interpolation: {
      escapeValue: false // not needed for server side
    },

    debug: process.env.NODE_ENV === 'development',

    preload: ['en', 'he'],

    ns: ['common', 'validation', 'api', 'auth', 'upload'],
    defaultNS: 'common'
  });

module.exports = i18next;