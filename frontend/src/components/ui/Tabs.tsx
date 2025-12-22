import React, { useState } from 'react';

interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTabId?: string;
    className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTabId, className = '' }) => {
    const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);

    return (
        <div className={`w-full ${className}`}>
            <div className="flex border-b border-gray-200 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`flex-1 py-4 px-6 text-center bg-brand-50 font-medium text-sm sm:text-base transition-colors duration-200 border-b-2 ${activeTabId === tab.id
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="mt-4">
                {tabs.find((tab) => tab.id === activeTabId)?.content}
            </div>
        </div>
    );
};

export default Tabs;
