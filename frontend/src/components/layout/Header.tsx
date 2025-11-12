import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const Header: FC = () => {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-pink-500">
              StartupOS
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium">Home</Link>
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
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
