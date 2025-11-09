import React from 'react';
import { Toaster } from 'react-hot-toast';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TranslatorInterface from './pages/TranslatorInterface.tsx';
import VoiceTranslatePage from './pages/VoiceTranslatePage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import FavoritesPage from './pages/FavoritesPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import Header from './components/layout/Header.tsx';
import AuthProvider from './context/AuthContext.tsx';
import { useAuth } from './context/AuthContext.tsx';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
function App() {

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route
                path="/"
                element={
                  <TranslatorInterface />
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/voice-translate"
                element={<VoiceTranslatePage />}
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                maxWidth: '400px',
                textAlign: 'center',
                fontSize: '15px',
                borderRadius: '8px',
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
      </Router>
    </AuthProvider>
  );
}

export default App;
