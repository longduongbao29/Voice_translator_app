
import React, { useState, useRef } from 'react';
import { Globe, Languages, ChevronDown, LogIn, User, Mic, WholeWord } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Link } from 'react-router-dom';
import LoginModal from '../modals/LoginModal.tsx';
import RegisterModal from '../modals/RegisterModal.tsx';
import UserMenu from './UserMenu.tsx';


interface HeaderProps {
}

const Header: React.FC<HeaderProps> = () => {
  const { isAuthenticated, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const handleAuthClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowUserMenu(!showUserMenu);
    }
  };

  const closeAllModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  const switchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const switchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <a href="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold text-secondary-900">Translator app</h1>
                <p className="text-sm text-secondary-600">Translate text and speech in real-time</p>
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-secondary-600">
            <div className="flex items-center space-x-2">
              <Languages className="w-5 h-5" />
              <span className="text-sm font-medium">Multi-language Support</span>
            </div>
            <Link
              to="/"
              className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-secondary-100 transition-colors"
            >
              <WholeWord className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Text Translate</span>
            </Link>

            <Link
              to="/voice-translate"
              className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-secondary-100 transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Voice Translate</span>
            </Link>

            <button
              className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-secondary-100 transition-colors"
              onClick={handleAuthClick}
              ref={userButtonRef}
            >
              {isAuthenticated ? (
                <>
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">{user?.username}</span>
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Đăng nhập</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <LoginModal onClose={closeAllModals} onSwitchToRegister={switchToRegister} />
      )}

      {showRegisterModal && (
        <RegisterModal onClose={closeAllModals} onSwitchToLogin={switchToLogin} />
      )}

      {isAuthenticated && (
        <UserMenu
          isOpen={showUserMenu}
          onClose={() => setShowUserMenu(false)}
          anchorRef={userButtonRef}
        />
      )}
    </header>
  );
};

export default Header;
