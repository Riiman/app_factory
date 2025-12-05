import React, { FC } from 'react';
import { GoogleIcon } from './Icons';

const AuthFormWrapper: FC<{ title: string; children: React.ReactNode; footer: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
                {children}
                {/* <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-3">
                        <div>
                            <button
                                type="button"
                                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <span className="sr-only">Sign in with Google</span>
                                <GoogleIcon />
                            </button>
                        </div>
                    </div>
                </div> */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    {footer}
                </div>
            </div>
        </div>
    </div>
);

export default AuthFormWrapper;
