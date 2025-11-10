import React, { FC, HTMLProps } from 'react';

interface ButtonProps extends HTMLProps<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

const Button: FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 duration-200 ease-in-out";

  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-600 to-pink-500 text-white hover:from-blue-700 hover:to-pink-600 focus:ring-blue-500",
    secondary: "bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-800",
    outline: "bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-600",
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
