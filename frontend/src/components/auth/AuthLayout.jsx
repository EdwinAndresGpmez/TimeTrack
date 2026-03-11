import React from 'react';
import { Link } from 'react-router-dom';
import { useUI } from '../../context/UIContext';

const AuthLayout = ({ children, title }) => {
    const { t } = useUI();

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] dark:from-slate-950 dark:to-slate-800 flex items-center justify-center relative overflow-hidden font-sans px-4 py-8">
            <div className="absolute top-[10%] left-[80%] w-24 h-24 bg-white/10 rounded-full blur-sm animate-float"></div>
            <div className="absolute bottom-[5%] left-[10%] w-64 h-64 bg-white/10 rounded-full blur-sm animate-float-delayed"></div>

            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 border border-white/50 dark:border-slate-700">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-blue-900 dark:text-blue-300 mb-2">{t('appTitle')}</h2>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
                </div>

                {children}

                <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
                    <Link to="/" className="text-blue-500 dark:text-blue-400 hover:underline">
                        &larr; {t('backToPortal')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;

