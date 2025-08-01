/* Enhanced app.css - Sophisticated Minimalism */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Refined color palette with more depth */
    --color-zen-50: #fafafa;
    --color-zen-100: #f4f4f5;
    --color-zen-200: #e4e4e7;
    --color-zen-300: #d4d4d8;
    --color-zen-400: #a1a1aa;
    --color-zen-500: #71717a;
    --color-zen-600: #52525b;
    --color-zen-700: #3f3f46;
    --color-zen-800: #27272a;
    --color-zen-900: #18181b;
    
    /* Accent colors - muted but distinctive */
    --color-blue-soft: #dbeafe;
    --color-blue-muted: #93c5fd;
    --color-blue-accent: #3b82f6;
    
    /* Semantic colors */
    --color-surface: #ffffff;
    --color-surface-soft: #fafafa;
    --color-border-light: rgba(0, 0, 0, 0.06);
    --color-border-medium: rgba(0, 0, 0, 0.12);
  }

  * {
    font-feature-settings: "cv11", "ss01", "ss03";
  }

  body {
    @apply bg-zen-50 text-zen-800;
    font-family: 'Inter var', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
}

@layer components {
  /* Container with subtle max-width */
  .container-zen {
    @apply max-w-7xl mx-auto px-6;
  }

  /* Enhanced card with subtle depth */
  .card-zen {
    @apply bg-white rounded-xl;
    box-shadow: 
      0 0 0 1px var(--color-border-light),
      0 2px 4px -2px rgba(0, 0, 0, 0.05),
      0 4px 6px -4px rgba(0, 0, 0, 0.03);
    transition: all 0.2s ease;
  }

  .card-zen:hover {
    box-shadow: 
      0 0 0 1px var(--color-border-medium),
      0 4px 8px -4px rgba(0, 0, 0, 0.08),
      0 8px 12px -8px rgba(0, 0, 0, 0.04);
    transform: translateY(-1px);
  }

  /* Sophisticated button styles */
  .btn-primary {
    @apply px-5 py-2.5 bg-zen-900 text-white rounded-lg font-medium text-sm;
    box-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.05),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    @apply bg-zen-800;
    transform: translateY(-1px);
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  /* Refined tab navigation */
  .tab-nav {
    @apply flex items-center px-5 py-3 text-sm font-medium rounded-lg;
    position: relative;
    transition: all 0.2s ease;
  }

  .tab-active {
    @apply text-zen-900 bg-white;
    box-shadow: 
      0 0 0 1px var(--color-border-light),
      0 2px 4px -2px rgba(0, 0, 0, 0.05);
  }

  .tab-inactive {
    @apply text-zen-500 hover:text-zen-700;
  }

  .tab-inactive:hover {
    @apply bg-white/50;
  }

  /* Loading states with sophistication */
  .loading {
    @apply bg-gradient-to-r from-zen-100 via-zen-50 to-zen-100;
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Feed-specific enhancements */
  .feed-source {
    @apply inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium;
    background: var(--color-zen-50);
    border: 1px solid var(--color-border-light);
  }

  .feed-item {
    @apply block p-4 -mx-4 rounded-lg;
    transition: all 0.15s ease;
  }

  .feed-item:hover {
    @apply bg-zen-50;
    transform: translateX(4px);
  }

  .feed-title {
    @apply font-medium text-zen-900 leading-snug;
    font-size: 0.925rem;
    letter-spacing: -0.01em;
  }

  .feed-description {
    @apply text-sm text-zen-600 mt-1 leading-relaxed;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .feed-meta {
    @apply flex items-center gap-3 text-xs text-zen-500 mt-2;
  }

  /* Refined form inputs */
  .input-zen {
    @apply w-full px-4 py-2.5 rounded-lg text-sm;
    background: var(--color-zen-50);
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .input-zen:hover {
    border-color: var(--color-border-light);
    background: white;
  }

  .input-zen:focus {
    @apply outline-none bg-white;
    border-color: var(--color-border-medium);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.05);
  }

  /* Typography refinements */
  .heading-1 {
    @apply text-2xl font-semibold text-zen-900;
    letter-spacing: -0.025em;
  }

  .heading-2 {
    @apply text-lg font-semibold text-zen-900;
    letter-spacing: -0.02em;
  }

  .text-secondary {
    @apply text-sm text-zen-600;
  }

  .text-tertiary {
    @apply text-xs text-zen-500;
  }

  /* Subtle dividers */
  .divider-light {
    @apply border-t border-zen-100;
  }

  .divider-medium {
    @apply border-t-2 border-zen-100;
  }

  /* Status indicators */
  .status-dot {
    @apply w-2 h-2 rounded-full;
    box-shadow: 0 0 0 4px rgba(var(--dot-color), 0.1);
  }

  /* Smooth transitions for interactive elements */
  button, a, input, select, textarea {
    transition: all 0.2s ease;
  }
}

/* Specific component enhancements */

/* Header refinement */
.app-header {
  @apply bg-white/80 backdrop-blur-sm;
  border-bottom: 1px solid var(--color-border-light);
}

/* Navigation enhancement */
.app-nav {
  @apply bg-white/50 backdrop-blur-sm sticky top-0 z-10;
  border-bottom: 1px solid var(--color-border-light);
}

/* Feed cards makeover */
.feed-card {
  @apply card-zen p-0 overflow-hidden;
}

.feed-card-header {
  @apply flex items-center justify-between px-5 py-4;
  background: linear-gradient(to bottom, var(--color-zen-50), transparent);
  border-bottom: 1px solid var(--color-border-light);
}

.feed-card-body {
  @apply px-5 py-4 space-y-4;
}

/* Refined empty states */
.empty-state {
  @apply text-center py-12;
}

.empty-state-icon {
  @apply text-4xl mb-3 opacity-50;
}

.empty-state-text {
  @apply text-zen-600 text-sm;
}

/* Micro-interactions */
.clickable {
  @apply cursor-pointer select-none;
  -webkit-tap-highlight-color: transparent;
}

/* Subtle animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Focus states that feel premium */
:focus-visible {
  @apply outline-none;
  box-shadow: 0 0 0 2px var(--color-blue-accent);
}

/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--color-zen-50);
}

::-webkit-scrollbar-thumb {
  background: var(--color-zen-300);
  border-radius: 5px;
  border: 2px solid var(--color-zen-50);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-zen-400);
}