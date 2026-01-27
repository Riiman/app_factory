import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Users,
    Megaphone,
    Package,
    DollarSign,
    Calculator,
    ArrowRight
} from 'lucide-react';

interface ModuleHealthCardProps {
    module: 'business' | 'crm' | 'marketing' | 'product' | 'accounting' | 'fundraising';
    status: 'healthy' | 'warning' | 'critical';
    keyMetric: string;
    onClick?: () => void;
}

const MODULE_CONFIG = {
    business: {
        name: 'Business',
        icon: Briefcase,
        color: 'blue',
        route: '/business'
    },
    crm: {
        name: 'CRM',
        icon: Users,
        color: 'purple',
        route: '/crm'
    },
    marketing: {
        name: 'Marketing',
        icon: Megaphone,
        color: 'pink',
        route: '/marketing'
    },
    product: {
        name: 'Product',
        icon: Package,
        color: 'indigo',
        route: '/product'
    },
    accounting: {
        name: 'Accounting',
        icon: Calculator,
        color: 'green',
        route: '/accounting'
    },
    fundraising: {
        name: 'Fundraising',
        icon: DollarSign,
        color: 'amber',
        route: '/fundraising'
    }
};

const STATUS_CONFIG = {
    healthy: {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        dotColor: 'bg-green-500',
        textColor: 'text-green-700'
    },
    warning: {
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700'
    },
    critical: {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        dotColor: 'bg-red-500',
        textColor: 'text-red-700'
    }
};

const ModuleHealthCard: React.FC<ModuleHealthCardProps> = ({
    module,
    status,
    keyMetric,
    onClick
}) => {
    const navigate = useNavigate();
    const config = MODULE_CONFIG[module];
    const statusConfig = STATUS_CONFIG[status];
    const Icon = config.icon;

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            // Navigate to module (would need proper routing setup)
            navigate(`?scope=${config.route.substring(1)}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`
        relative p-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200 hover:shadow-md
        ${statusConfig.bgColor} ${statusConfig.borderColor}
      `}
        >
            {/* Status Indicator Dot */}
            <div className="absolute top-3 right-3">
                <div className={`h-2 w-2 rounded-full ${statusConfig.dotColor}`} />
            </div>

            {/* Module Icon */}
            <div className={`inline-flex p-2 rounded-lg bg-${config.color}-100 mb-3`}>
                <Icon className={`h-5 w-5 text-${config.color}-600`} />
            </div>

            {/* Module Name */}
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {config.name}
            </h3>

            {/* Key Metric */}
            <p className={`text-xs font-medium ${statusConfig.textColor} mb-2`}>
                {keyMetric}
            </p>

            {/* View Details Link */}
            <div className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                <span>View details</span>
                <ArrowRight className="h-3 w-3 ml-1" />
            </div>
        </div>
    );
};

export default ModuleHealthCard;
