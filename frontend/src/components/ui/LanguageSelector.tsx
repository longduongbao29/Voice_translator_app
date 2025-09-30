import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../../types';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  label: string;
  includeAuto?: boolean;
  detectedLanguage?: string;
  isDetecting?: boolean;

}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onLanguageChange,
  label,
  includeAuto = false,
  detectedLanguage = '',
  isDetecting = false,
}) => {

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-600">
          {label}
        </label>
        {selectedLanguage === 'auto' && detectedLanguage && (
          <span className="text-xs font-medium text-blue-600">
            Detected: {languages.find(lang => lang.code === detectedLanguage)?.name || detectedLanguage}
          </span>
        )}
        {selectedLanguage === 'auto' && isDetecting && !detectedLanguage && (
          <span className="text-xs text-amber-600 flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Detecting...
          </span>
        )}
      </div>

      <div className="relative">
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8 cursor-pointer bg-white"
        >
          {includeAuto && (
            <option value="auto">Auto-detect</option>
          )}
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};

export default LanguageSelector;
