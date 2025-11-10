import React, { FC, HTMLProps } from 'react';

interface InputProps extends HTMLProps<HTMLInputElement> {
  label: string;
  id: string;
}

const Input: FC<InputProps> = ({ label, id, type = 'text', ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          type={type}
          {...props}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </div>
  );
};

export default Input;
