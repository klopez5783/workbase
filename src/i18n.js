import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './i18-languages/sp/translation.json';
import en from './i18-languages/en/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es }
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;