/**
 * @file Header.tsx
 * @description The main header component for the application.
 * It displays the startup's name and current stage, and contains global action buttons
 * like the "Create" button and a user profile button.
 */

import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, User as UserIcon } from 'lucide-react';
import { User } from '@/types/dashboard-types';
import UserProfileMenu from './UserProfileMenu';

/**
 * Props for the Header component.
 * @interface HeaderProps
 */
interface HeaderProps {
    /** The name of the startup to display. */
    startupName: string;
    /** The current stage of the startup (e.g., 'Seed'). */
    currentStage: string;
    /** The currently authenticated user object. */
    user: User;
    /** Callback function triggered when the global "Create" button is clicked. */
    onCreateClick: () => void;
    /** Callback function triggered when the "Settings" menu item is clicked. */
    onSettingsClick: () => void;
    /** Callback function triggered when the "Logout" menu item is clicked. */
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ startupName, currentStage, user, onCreateClick, onSettingsClick, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    /**
     * Effect to handle clicks outside of the user profile menu to close it.
     * This improves the user experience by not requiring an explicit close action.
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{startupName}</h2>
                <p className="text-xs text-gray-500">{currentStage}</p>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                    onClick={onCreateClick}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Create</span>
                </button>
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                    >
                        <UserIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    {isMenuOpen && (
                        <UserProfileMenu 
                            user={user}
                            onSettingsClick={() => {
                                onSettingsClick();
                                setIsMenuOpen(false);
                            }}
                            onLogout={() => {
                                onLogout();
                                setIsMenuOpen(false);
                            }}
                        />
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;