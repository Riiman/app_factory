/**
 * @file Sidebar.tsx
 * @description A persistent sidebar component for main application navigation.
 * It displays a list of scopes and their sub-pages, handles collapsible sections,
 * and highlights the currently active page.
 */

import React, { useState } from 'react';
import { Scope } from '@/types/dashboard-types';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Represents a single top-level item in the sidebar menu.
 * @interface MenuItem
 */
interface MenuItem {
    /** The display name of the menu item (e.g., 'Product'). */
    name: string;
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
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems, activeScope, activeSubPage, onNavClick }) => {
    /** Internal state to manage which collapsible sections are currently open. */
    const [openScopes, setOpenScopes] = useState<Set<string>>(new Set([activeScope.toString(), Scope.WORKSPACE.toString()]));

    /**
     * Toggles the open/closed state of a collapsible menu section.
     * @param {string} scopeName - The name of the scope to toggle.
     */
    const toggleScope = (scopeName: string) => {
        setOpenScopes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(scopeName)) {
                newSet.delete(scopeName);
            } else {
                newSet.add(scopeName);
            }
            return newSet;
        });
    };
    
    /**
     * Checks if a given scope name matches the currently active scope.
     * @param {string} scopeName - The name of the scope to check.
     * @returns {boolean} True if the scope is active.
     */
    const isScopeActive = (scopeName: string) => {
        return activeScope.toString().toLowerCase() === scopeName.toLowerCase();
    }


    return (
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center justify-center border-b border-gray-200">
                <h1 className="text-2xl font-bold text-brand-primary">StartupOS</h1>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = isScopeActive(item.name);
                    const isOpen = openScopes.has(item.name);
                    const Icon = item.icon;

                    if (item.subItems.length === 0) {
                        return (
                            <a
                                key={item.name}
                                href="#"
                                onClick={(e) => { e.preventDefault(); onNavClick(item.name); }}
                                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                                    isActive ? 'bg-indigo-50 text-brand-primary' : 'text-gray-700 hover:bg-gray-100'
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
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                                    isActive ? 'bg-indigo-50 text-brand-primary' : 'text-gray-700 hover:bg-gray-100'
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
                                            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                                                isActive && activeSubPage === subItem ? 'text-brand-primary font-semibold' : 'text-gray-500 hover:text-gray-900'
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
        </aside>
    );
};

export default Sidebar;