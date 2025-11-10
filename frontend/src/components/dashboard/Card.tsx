/**
 * @file Card.tsx
 * @description A generic, reusable card component for displaying content in a structured
 * and visually appealing way. It supports an optional title and action buttons.
 */

import React from 'react';

/**
 * Props for the Card component.
 * @interface CardProps
 */
interface CardProps {
    /** An optional title to display in the card's header. */
    title?: string;
    /** The main content to be rendered inside the card. */
    children: React.ReactNode;
    /** Optional additional CSS classes to apply to the card container. */
    className?: string;
    /** Optional React nodes (e.g., buttons) to display in the card's header. */
    actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', actions }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
            {(title || actions) && (
                <div className="px-4 py-3 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    {title && <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>}
                    {actions && <div className="flex items-center space-x-2">{actions}</div>}
                </div>
            )}
            <div className="p-4 sm:p-6">
                {children}
            </div>
        </div>
    );
};

export default Card;