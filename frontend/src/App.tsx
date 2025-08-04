import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import TranslatorInterface from './components/TranslatorInterface.tsx';
import Header from './components/Header.tsx';
import { Language } from './types';

function App() {
  const [languages] = useState<Language[]>([
    { code: 'en', name: 'English', native_name: 'English', supports_offline: true },
    { code: 'vi', name: 'Vietnamese', native_name: 'Tiếng Việt', supports_offline: true },
    { code: 'zh', name: 'Chinese', native_name: '中文', supports_offline: true },
    { code: 'ja', name: 'Japanese', native_name: '日本語', supports_offline: true },
    { code: 'ko', name: 'Korean', native_name: '한국어', supports_offline: true },
    { code: 'fr', name: 'French', native_name: 'Français', supports_offline: true },
    { code: 'de', name: 'German', native_name: 'Deutsch', supports_offline: true },
    { code: 'es', name: 'Spanish', native_name: 'Español', supports_offline: true },
    { code: 'it', name: 'Italian', native_name: 'Italiano', supports_offline: true },
    { code: 'pt', name: 'Portuguese', native_name: 'Português', supports_offline: true },
    { code: 'ru', name: 'Russian', native_name: 'Русский', supports_offline: true },
    { code: 'ar', name: 'Arabic', native_name: 'العربية', supports_offline: true },
    { code: 'th', name: 'Thai', native_name: 'ไทย', supports_offline: true },
    { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', supports_offline: true }
  ]);
  // const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Only fetch from API if backend is available
    // For now, we'll use the default languages
    // Uncomment below to fetch languages from API
    // const fetchLanguages = async () => {
    //   try {
    //     setLoading(true);
    //     const response = await translationApi.getLanguages();
    //     if (response.success && response.data) {
    //       setLanguages(response.data);
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch languages:', error);
    //     // Keep default languages if API fails
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchLanguages();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <TranslatorInterface
          languages={languages}
          isSettingsOpen={isSettingsOpen}
          onCloseSettings={() => setIsSettingsOpen(false)}
        />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
