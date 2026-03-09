import React, { FC } from 'react';

const AuthFormWrapper: FC<{
    title: React.ReactNode;
    children: React.ReactNode;
    footer: React.ReactNode;
    logoUrl?: string;
}> = ({ title, children, footer, logoUrl }) => (
    <div className="flex-grow w-full flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
            {logoUrl && (
                <img
                    src={logoUrl}
                    alt="Organization Logo"
                    className="h-16 object-contain mb-4"
                />
            )}
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
                {children}
                <div className="mt-6 text-center text-sm text-gray-600">
                    {footer}
                </div>
            </div>
        </div>
    </div>
);

export default AuthFormWrapper;
