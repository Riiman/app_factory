import React, { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const Header: FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer">
            <Link to="/" className="text-3xl font-bold bg-clip-text text-transparent animate-gradient-x">
              VentureStack
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-4">
            {/* Features link removed */}
          </nav>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="outline" className="px-4 py-2 text-sm hover:bg-gray-50 border-gray-300 text-gray-700">Login</Button>
            </Link>

            <div
              className="relative group"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <Button className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2">
                Get Started
                <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>

              <div className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top-right ${isDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                <div className="p-2 space-y-1">
                  <Link to="/signup" className="block px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors">
                    <p className="text-sm font-semibold text-gray-900">For Ventures</p>
                    <p className="text-xs text-gray-500 mt-0.5">Build and grow your company</p>
                  </Link>
                  <Link to="/org/signup" className="block px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors">
                    <p className="text-sm font-semibold text-gray-900">For Organizations</p>
                    <p className="text-xs text-gray-500 mt-0.5">Manage your portfolio</p>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
