# CSS Production Build Fix for Vercel

The issue is that Tailwind CSS is not being processed correctly in your production build. Here are the specific fixes:

## 1. Update your `tailwind.config.js`

Make sure it includes ALL possible locations where Tailwind classes might be used:

```javascript
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
```

## 2. Create a `.env` file in your root directory

```
NODE_ENV=production
```

## 3. Update your `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    cssCodeSplit: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'assets/main.css';
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
})
```

## 4. Update your `package.json` build script

```json
{
  "scripts": {
    "dev": "vite dev --port 5173",
    "build": "NODE_ENV=production vite build",
    "preview": "vite preview"
  }
}
```

## 5. Add PostCSS environment check

Update `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  },
}
```

## 6. Force CSS injection in your App.svelte

Add this to the top of your `App.svelte` file:

```svelte
<script>
  import { onMount } from 'svelte';
  
  // Force CSS to be included in production build
  onMount(() => {
    // This ensures Tailwind classes are not purged
    const testClasses = [
      'bg-white', 'text-gray-800', 'container-zen', 'card-zen',
      'btn-primary', 'tab-active', 'tab-inactive', 'loading'
    ];
  });
</script>

<style global>
  /* Ensure Tailwind directives are processed */
  @import './app.css';
</style>
```

## 7. Alternative: Inline Critical CSS

If the above doesn't work, add this to your `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClearMind - Your AI Learning Sanctuary</title>
    <style>
      /* Critical CSS - Tailwind reset */
      *, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

## 8. Debug Build Locally

Run these commands to test your production build locally:

```bash
# Clean build
rm -rf dist

# Build with verbose output
npm run build

# Check if CSS file exists
ls -la dist/assets/

# Preview production build
npm run preview
```

## 9. Check Vercel Build Output

In your Vercel dashboard:
1. Go to your project
2. Click on the latest deployment
3. Check the "Build Logs"
4. Look for any warnings about CSS or PostCSS

## 10. Nuclear Option - Force Rebuild on Vercel

```bash
# Add a space to force rebuild
echo " " >> README.md
git add .
git commit -m "Force rebuild with CSS fix"
git push
```

## The Root Cause

The issue is likely that Tailwind's PurgeCSS is removing your classes in production because:
1. It can't find them in your Svelte components
2. The content paths in tailwind.config.js don't match your file structure
3. Dynamic classes are being purged

The fix in step 1 (updating content paths) should resolve this.