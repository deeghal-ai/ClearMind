/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,svelte}',
    './src/**/*.svelte',
    './src/pages/*.svelte',
    './src/lib/**/*.svelte',
    './src/lib/components/*.svelte'
  ],
  safelist: [
    // Force include essential classes that might be purged
    'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900',
    'text-white', 'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',
    'border-gray-100', 'border-gray-200', 'border-gray-300', 'border-gray-400', 'border-gray-500',
    'hover:bg-gray-100', 'hover:bg-gray-200', 'hover:text-gray-900',
    'bg-blue-500', 'bg-blue-600', 'text-blue-600', 'text-blue-500',
    'bg-green-500', 'bg-green-600', 'text-green-600', 'text-green-500',
    'bg-red-500', 'bg-red-600', 'text-red-600', 'text-red-500',
    'p-2', 'p-3', 'p-4', 'p-6', 'px-2', 'px-3', 'px-4', 'px-6', 'py-2', 'py-3', 'py-4', 'py-6',
    'm-2', 'm-3', 'm-4', 'm-6', 'mx-2', 'mx-3', 'mx-4', 'mx-6', 'my-2', 'my-3', 'my-4', 'my-6',
    'rounded', 'rounded-lg', 'rounded-md', 'rounded-full',
    'shadow', 'shadow-lg', 'shadow-md', 'shadow-sm'
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