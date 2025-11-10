/**
 * @file UserProfileMenu.tsx
 * @description A dropdown menu component that appears when the user icon in the header is clicked.
 * It displays user information and provides links for settings and logging out.
 */

import React from 'react';
import { User } from '@/types/dashboard-types';
import { Settings, LogOut } from 'lucide-react';

/**
 * Props for the UserProfileMenu component.
 * @interface UserProfileMenuProps
 */
interface UserProfileMenuProps {
    /** The currently authenticated user object. */
    user: User;
    /** Callback function triggered when the "Settings" menu item is clicked. */
    onSettingsClick: () => void;
    /** Callback function triggered when the "Logout" menu item is clicked. */
    onLogout: () => void;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ user, onSettingsClick, onLogout }) => {
    return (
        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="py-1">
                <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
                <button
                    onClick={onSettingsClick}
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                    <Settings className="mr-3 h-5 w-5 text-gray-400" />
                    <span>Settings</span>
                </button>
                <button
                    onClick={onLogout}
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                    <LogOut className="mr-3 h-5 w-5 text-red-400" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default UserProfileMenu;