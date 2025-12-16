import React, { FC, HTMLProps } from 'react';

interface ButtonProps extends HTMLProps<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

const Button: FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 duration-200 ease-in-out";

  const variantClasses = {
    primary: "bg-gradient-to-r from-brand-600 to-accent-500 text-white hover:from-brand-500 hover:to-accent-400 focus:ring-accent-500",
    secondary: "bg-brand-900 text-white hover:bg-brand-800 focus:ring-brand-700",
    outline: "bg-transparent border-2 border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white focus:ring-brand-500",
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
