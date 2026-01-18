import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

function LanguageSwitcher({ 
  fixed = false,    // Whether to use fixed positioning
  compact = false,  // Compact mode for inline use
  className = ""    // Custom className override
}) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Fixed positioning (like WorkerClockIn page)
  if (fixed) {
    return (
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-lg z-50"
      >
        <Globe size={18} />
        {i18n.language === 'en' ? 'Español' : 'English'}
      </button>
    );
  }

  // Compact mode for inline use (smaller, shows language code on tiny screens)
  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        className="bg-blue-600 text-white px-2 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md "
      >
        <Globe size={14} className="sm:w-4 sm:h-4" />
        {/* Show language code on very small screens, full name on larger */}
        <span className="hidden xs:inline">
          {i18n.language === 'en' ? 'Español' : 'English'}
        </span>
        <span className="xs:hidden">
          {i18n.language === 'en' ? 'ESP' : 'ENG'}
        </span>
      </button>
    );
  }

  // Default inline mode (current style)
  return (
    <button
      onClick={toggleLanguage}
      className={className || "bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"}
    >
      <Globe size={18} />
      {i18n.language === 'en' ? 'Español' : 'English'}
    </button>
  );
}

export default LanguageSwitcher;