/**
 * @file Sidebar.tsx
 * @description A persistent sidebar component for main application navigation.
 * It displays a list of scopes and their sub-pages, handles collapsible sections,
 * and highlights the currently active page.
 */

import React, { useState } from 'react';
import { Scope } from '@/types/dashboard-types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Represents a single top-level item in the sidebar menu.
 * @interface MenuItem
 */
interface MenuItem {
    /** The display name of the menu item (e.g., 'Product'). */
    name: string;
    /** The actual scope enum value, if different from name. */
    scope?: Scope;
    /** The Lucide icon component to display. */
    icon: React.ElementType;
    /** A list of sub-page names for this menu item. */
    subItems: string[];
}

/**
 * Props for the Sidebar component.
 * @interface SidebarProps
 */
interface SidebarProps {
    /** The configuration for all menu items to be displayed. */
    menuItems: MenuItem[];
    /** The currently active main scope, used for highlighting. */
    activeScope: Scope;
    /** The currently active sub-page, used for highlighting. */
    activeSubPage: string;
    /** Callback function triggered when a navigation link is clicked. */
    onNavClick: (scope: string, subPage?: string) => void;
    /** Optional list of items to display pinned to the bottom. */
    bottomItems?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems, activeScope, activeSubPage, onNavClick, bottomItems }) => {
    /** Internal state to manage which collapsible section is currently open. */
    const [openScope, setOpenScope] = useState<string | null>(activeScope ? activeScope.toString() : Scope.WORKSPACE.toString());
    const { user } = useAuth(); // Access user context for organization details

    /**
     * Toggles the open/closed state of a collapsible menu section.
     * @param {string} scopeName - The name of the scope to toggle.
     */
    const toggleScope = (scopeName: string) => {
        setOpenScope(prev => prev === scopeName ? null : scopeName);
    };

    /**
     * Checks if a given menu item is active.
     */
    const isItemActive = (item: MenuItem) => {
        if (item.scope) {
            return activeScope === item.scope;
        }
        return activeScope?.toString().toLowerCase() === item.name.toLowerCase();
    }

    console.log("Sidebar: user:", user);
    console.log("Sidebar: user.organization:", user?.organization);
    console.log("Sidebar: user.organization.logo_url:", user?.organization?.logo_url);


    return (
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-24 flex flex-col items-center justify-center border-b border-gray-200 p-4">
                {user?.organization?.logo_url ? (
                    <div className="flex flex-col items-center w-full">
                        <img
                            src={user.organization.logo_url}
                            alt={user.organization.name}
                            className="h-10 object-contain mb-2"
                        />
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500 animate-pulse">Powered by VentureStack</span>
                    </div>
                ) : (
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500">VentureStack</h1>
                )}
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = isItemActive(item);
                    const isOpen = openScope === item.name;
                    const Icon = item.icon;

                    if (item.subItems.length === 0) {
                        return (
                            <a
                                key={item.name}
                                href="#"
                                onClick={(e) => { e.preventDefault(); onNavClick(item.name); }}
                                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${isActive ? 'bg-indigo-50 text-brand-primary' : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                <span>{item.name}</span>
                            </a>
                        );
                    }

                    return (
                        <div key={item.name}>
                            <button
                                onClick={() => {
                                    if (!isOpen) { // Only navigate if closing
                                        onNavClick(item.name, item.subItems[0])
                                    }
                                    toggleScope(item.name);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${isActive ? 'bg-indigo-50 text-brand-primary' : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="flex items-center">
                                    <Icon className="mr-3 h-5 w-5" />
                                    <span>{item.name}</span>
                                </span>
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            {isOpen && (
                                <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-200">
                                    {item.subItems.map((subItem) => (
                                        <a
                                            key={subItem}
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); onNavClick(item.name, subItem); }}
                                            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${isActive && activeSubPage === subItem ? 'text-brand-primary font-semibold' : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                        >
                                            {subItem}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
            {/* Bottom Pinned Items */}
            {bottomItems && bottomItems.length > 0 && (
                <div className="border-t border-gray-200 px-2 py-4 space-y-1">
                    {bottomItems.map((item) => {
                        const isActive = isItemActive(item);
                        const Icon = item.icon;
                        return (
                            <a
                                key={item.name}
                                href="#"
                                onClick={(e) => { e.preventDefault(); onNavClick(item.name); }}
                                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${isActive ? 'bg-indigo-50 text-brand-primary' : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                <span>{item.name}</span>
                            </a>
                        );
                    })}
                </div>
            )}
        </aside>
    );
};

export default Sidebar;