import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select 
      value={i18n.language} 
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="px-3 py-2 border rounded"
    >
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  );
}

export default LanguageSwitcher;