import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const Header: FC = () => {
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
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
          </nav>
          <div className="flex items-center space-x-2">
            <Link to="/login">
              <Button variant="outline" className="px-4 py-2 text-sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button className="px-4 py-2 text-sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
