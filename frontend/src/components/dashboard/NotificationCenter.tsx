import React, { useState } from 'react';
import { DashboardNotification } from '../../types/dashboard-types';
import { Bell, Check, Info, AlertTriangle, XCircle } from 'lucide-react';

interface NotificationCenterProps {
    notifications: DashboardNotification[];
    onMarkAsRead: (id: number) => void;
    align?: 'left' | 'right';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onMarkAsRead, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <Check className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-brand-primary transition-colors rounded-full hover:bg-slate-100"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden`}>
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-semibold text-brand-text-primary">Notifications</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${notification.read ? 'opacity-60' : ''} `}
                                        onClick={() => !notification.read && onMarkAsRead(notification.id)}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${notification.read ? 'font-medium' : 'font-bold'} text-brand-text-primary`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-brand-text-secondary mt-1">{notification.message}</p>
                                                <p className="text-xs text-slate-400 mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="h-2 w-2 bg-brand-primary rounded-full mt-1.5"></div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    No notifications.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
