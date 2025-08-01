/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}"
  ],
  safelist: [
    // Core utility classes that must be included
    'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900',
    'text-white', 'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',
    'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6',
    'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-5', 'mx-6', 'my-1', 'my-2', 'my-3', 'my-4', 'my-5', 'my-6',
    'flex', 'grid', 'block', 'inline', 'inline-block', 'hidden', 'w-full', 'h-full', 'min-h-screen', 'container', 'mx-auto',
    'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full',
    'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl',
    'border', 'border-2', 'border-gray-100', 'border-gray-200', 'border-gray-300', 'border-gray-400', 'border-gray-500',
    
    // Dynamic state classes
    'opacity-50', 'cursor-not-allowed', 'animate-spin', 'rotate-180', 'line-through',
    
    // Background colors from dynamic conditions
    'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500',
    'bg-green-50', 'bg-blue-50', 'bg-purple-50', 'bg-orange-50', 'bg-yellow-50',
    'bg-green-100', 'bg-blue-100', 'bg-purple-100', 'bg-orange-100', 'bg-yellow-100',
    
    // Text colors from dynamic conditions
    'text-green-500', 'text-green-600', 'text-green-700', 'text-green-800',
    'text-blue-500', 'text-blue-600', 'text-blue-700', 'text-blue-800',
    'text-purple-500', 'text-purple-600', 'text-purple-700', 'text-purple-800',
    'text-orange-500', 'text-orange-600', 'text-orange-700', 'text-orange-800',
    'text-yellow-500', 'text-yellow-600', 'text-yellow-700', 'text-yellow-800',
    'text-red-500', 'text-red-600', 'text-red-700', 'text-red-800',
    'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',
    
    // Border colors from dynamic conditions
    'border-green-200', 'border-blue-200', 'border-purple-200', 'border-orange-200', 'border-yellow-200', 'border-red-200',
    
    // Ring classes for selected states
    'ring-2', 'ring-blue-500', 'ring-green-500', 'ring-purple-500',
    
    // Background opacity classes
    'bg-blue-50/50', 'bg-green-50/50', 'bg-purple-50/50',
    
    // Hover states that might be dynamic
    'hover:shadow-md', 'hover:bg-gray-50', 'hover:bg-gray-100',
  ],
  theme: {
    extend: {
      colors: {
        'zen-gray': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      }
    },
  },
  plugins: [],
}