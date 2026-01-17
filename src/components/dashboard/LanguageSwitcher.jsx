import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}  // ✅ Fixed: call the toggle function
      className=" bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-lg z-50"
    >
      <Globe size={18} />
      {i18n.language === 'en' ? 'Español' : 'English'}
    </button>
  );
}

export default LanguageSwitcher;