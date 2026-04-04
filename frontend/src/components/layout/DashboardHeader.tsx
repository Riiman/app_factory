import React from 'react';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { useAuth } from '@/contexts/AuthContext';

const DashboardHeader: React.FC = () => {
    const { handleLogout } = useAuth();

    return (
        <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50 shrink-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 relative">

                    {/* Centered Logo */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500">
                        <Link to="/dashboard">VentureStack</Link>
                    </div>

                    {/* Right-aligned content */}
                    <div className="ml-auto">
                        <Button
                            className="flex items-center gap-2 text-sm bg-gradient-to-r from-brand-600 to-accent-500 text-white hover:opacity-90 shadow-sm border-0"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
