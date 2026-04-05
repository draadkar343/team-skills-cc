import React from 'react';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
};

export default function Button({ children, variant = 'primary', className = '', loading, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
