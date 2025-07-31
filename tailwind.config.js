/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx,svelte}',
      './src/**/*.svelte',
      './src/pages/*.svelte',
      './src/lib/**/*.svelte',
      './src/lib/components/*.svelte'
    ],
    options: {
      // Disable safelist and use extract patterns instead
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || []
    }
  },
  // NUCLEAR: Disable all CSS purging for production
  purge: false,
  mode: 'jit',
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