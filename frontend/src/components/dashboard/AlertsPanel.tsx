import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Alert {
    type: 'critical' | 'warning' | 'info';
    module: string;
    message: string;
    priority?: number;
}

interface AlertsPanelProps {
    alerts: Alert[];
    maxAlerts?: number;
}

const ALERT_CONFIG = {
    critical: {
        icon: AlertCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        textColor: 'text-red-900'
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        iconColor: 'text-amber-600',
        textColor: 'text-amber-900'
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-900'
    }
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, maxAlerts = 5 }) => {
    const displayedAlerts = alerts.slice(0, maxAlerts);

    if (displayedAlerts.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-sm text-gray-600 font-medium">All systems operational</p>
                <p className="text-xs text-gray-400 mt-1">No alerts at this time</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {displayedAlerts.map((alert, index) => {
                const config = ALERT_CONFIG[alert.type];
                const Icon = config.icon;

                return (
                    <div
                        key={index}
                        className={`
              p-3 rounded-lg border
              ${config.bgColor} ${config.borderColor}
            `}
                    >
                        <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold uppercase ${config.iconColor}`}>
                                        {alert.module}
                                    </span>
                                    {alert.type === 'critical' && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                            Urgent
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm ${config.textColor}`}>
                                    {alert.message}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {alerts.length > maxAlerts && (
                <p className="text-xs text-gray-500 text-center pt-2">
                    +{alerts.length - maxAlerts} more alert{alerts.length - maxAlerts !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
};

export default AlertsPanel;
