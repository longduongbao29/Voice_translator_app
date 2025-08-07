import React, { useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, History, User, Settings, BookOpen } from 'lucide-react';

interface UserMenuProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
}

const UserMenu: React.FC<UserMenuProps> = ({ isOpen, onClose, anchorRef }) => {
    const { user, logout } = useAuth();
    const menuRef = useRef<HTMLDivElement>(null);

    // Xử lý đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    // Tính toán vị trí hiển thị dropdown
    const getPosition = () => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            return {
                top: rect.bottom + window.scrollY,
                right: window.innerWidth - rect.right - window.scrollX
            };
        }
        return { top: 0, right: 0 };
    };

    const position = getPosition();

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div
            className="absolute z-50 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
            style={{ top: `${position.top}px`, right: `${position.right}px` }}
            ref={menuRef}
        >
            {/* User info */}
            <div className="px-4 py-3 border-b border-secondary-100">
                <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-3 overflow-hidden max-w-[180px]">
                        <p className="text-sm font-medium text-secondary-900 truncate">{user?.full_name || user?.username}</p>
                        <p className="text-xs text-secondary-500 truncate" title={user?.email || ""}>{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
                <a
                    href="/profile"
                    onClick={onClose}
                    className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                >
                    <User className="mr-3 h-4 w-4 text-secondary-500" />
                    Hồ sơ cá nhân
                </a>

                <a
                    href="/history"
                    onClick={onClose}
                    className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                >
                    <History className="mr-3 h-4 w-4 text-secondary-500" />
                    Lịch sử dịch
                </a>

                <a
                    href="/favorites"
                    onClick={onClose}
                    className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                >
                    <BookOpen className="mr-3 h-4 w-4 text-secondary-500" />
                    Bản dịch đã lưu
                </a>

                <a
                    href="/settings"
                    onClick={onClose}
                    className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                >
                    <Settings className="mr-3 h-4 w-4 text-secondary-500" />
                    Cài đặt
                </a>

                <div className="border-t border-secondary-100 my-1"></div>

                <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                    <LogOut className="mr-3 h-4 w-4 text-red-500" />
                    Đăng xuất
                </button>
            </div>
        </div>
    );
};

export default UserMenu;
