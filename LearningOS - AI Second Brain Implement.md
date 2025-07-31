# LearningOS - AI Second Brain Implementation Guide

## Table of Contents
1. [Project Vision & Philosophy](#project-vision--philosophy)
2. [Product Overview](#product-overview)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [Implementation Plan](#implementation-plan)
6. [Component Specifications](#component-specifications)
7. [API Documentation](#api-documentation)
8. [Deployment Strategy](#deployment-strategy)
9. [Post-MVP Roadmap](#post-mvp-roadmap)

---

## Project Vision & Philosophy

### Core Vision
LearningOS is a minimalist digital sanctuary for serious learners focused on AI/ML. It's not another productivity app—it's a calm, focused space where learning can flourish without distraction.

### Design Principles

#### 🧘 Minimalism as a Feature
- Every element must earn its place
- White space is sacred—give ideas room to breathe
- Simplicity is sophistication

#### 🎯 Focus Over Features
- One primary action per screen
- Honor mental states (reading vs planning vs reflecting)
- Reduce cognitive load at every opportunity

#### 🌱 Growth-Oriented Architecture
- Build foundations that can support future expansion
- Start with the seed, not the tree
- Make it work, then make it beautiful

### Target User
A solopreneur or focused learner who:
- Is building deep knowledge in AI, LangChain, and agent orchestration
- Values calm, distraction-free interfaces
- Needs structure but wants flexibility
- Appreciates thoughtful design over feature bloat

---

## Product Overview

### Core Features (MVP)

#### 📰 Curated Feeds Tab
- Aggregates AI/ML content from HackerNews, ArXiv, Reddit
- Smart caching for offline access
- One-click refresh with visual feedback
- Grouped by source with collapsible cards

#### 🎯 Learning Roadmap Tab
- Pre-defined learning paths (LangChain, RAG, Evals)
- Visual progress tracking with completion percentages
- Resource links (docs, videos) for each stage
- Context-aware AI assistance per stage

#### 💬 AI Chat Tab
- Contextual conversations based on current activity
- Scoped to learning stage or recent feeds
- Clean, focused chat interface
- No chat history in MVP (stateless)

#### ✅ Progress Tracker Tab
- Daily learning goal setting
- Streak tracking with visual celebration
- Simple, motivating interface
- Export capability for personal records

### User Journey
```
Day 1: Discovery → "This feels different"
Day 7: Habit Formation → "I'm seeing patterns"
Day 30: Integration → "This is my routine"
Day 90: Transformation → "I can't imagine learning without this"
```

---

## Technical Architecture

### Tech Stack

#### Frontend
- **SvelteKit**: Fast development, tiny bundles, great DX
- **Tailwind CSS**: Utility-first styling for rapid development
- **No UI Library**: Hand-rolled components for full control

#### Backend
- **Supabase**: PostgreSQL + Auth + Realtime + Edge Functions
- **Database**: PostgreSQL with Row Level Security
- **Storage**: LocalStorage for user preferences

#### AI Integration
- **OpenAI API**: GPT-4 for contextual assistance
- **Edge Functions**: For API calls and feed processing

#### Deployment
- **Vercel**: Frontend hosting with edge functions
- **Supabase**: Managed backend infrastructure

### Architecture Decisions

#### Why SvelteKit?
- Faster development than React/Next.js
- Smaller bundle sizes (important for calm, fast UX)
- Built-in routing and SSR
- Simpler mental model for solo development

#### Why Supabase?
- Managed PostgreSQL with built-in auth
- Edge Functions for serverless compute
- Realtime subscriptions (future feature)
- Generous free tier

#### Why No Component Library?
- Full control over every pixel
- No fighting with abstractions
- Lighter bundle size
- Matches minimalist philosophy

### Project Structure
```
learningos/
├── src/
│   ├── routes/          # Page components
│   │   ├── +layout.svelte
│   │   ├── feeds/
│   │   ├── roadmap/
│   │   ├── chat/
│   │   └── tracker/
│   ├── lib/
│   │   ├── supabase.js  # DB client
│   │   ├── stores/      # Svelte stores
│   │   ├── utils/       # Helpers
│   │   └── components/  # Reusable UI
│   └── app.css         # Global styles
├── supabase/
│   └── migrations/     # Database schema
├── api/               # Edge functions
└── static/           # Static assets
```

---

## Database Schema

### Core Tables

```sql
-- Feed sources configuration
CREATE TABLE feed_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('rss', 'json', 'api')),
  category TEXT CHECK (category IN ('news', 'research', 'community', 'custom')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached feed items
CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES feed_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  author TEXT,
  pub_date TIMESTAMPTZ,
  guid TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, guid)
);

-- Learning roadmaps
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  completed_stages INTEGER[] DEFAULT '{}',
  current_stage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id)
);

-- Daily learning logs
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal TEXT,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Chat context (for future use)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  context_type TEXT CHECK (context_type IN ('general', 'roadmap', 'feeds')),
  context_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance
```sql
CREATE INDEX idx_feed_items_source_date ON feed_items(source_id, pub_date DESC);
CREATE INDEX idx_feed_items_fetched ON feed_items(fetched_at DESC);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
```

---

## Implementation Plan

### Day 1: Foundation & Navigation (6 hours)

#### Morning (3h)
1. **Project Setup**
   - Initialize SvelteKit with Vite
   - Configure Tailwind CSS
   - Setup Supabase client
   - Create environment variables

2. **Core Layout**
   - Navigation component with 4 tabs
   - Responsive design with mobile-first approach
   - Global styles and design tokens
   - Loading states and skeletons

#### Afternoon (3h)
3. **Page Shells**
   - Create route structure
   - Basic page components for each tab
   - Consistent header and layout
   - Deploy to Vercel

**Deliverables**: Working navigation, deployed app shell

### Day 2: Feeds Implementation (6 hours)

#### Morning (3h)
1. **Feed Infrastructure**
   - Database schema for feeds
   - RSS parsing utilities
   - Feed fetching API endpoint
   - Caching strategy

2. **Feed UI Components**
   - FeedCard component
   - Loading skeletons
   - Error boundaries
   - Empty states

#### Afternoon (3h)
3. **Feed Features**
   - Refresh functionality
   - Feed settings modal
   - Search/filter capability
   - Offline support with localStorage

**Deliverables**: Fully functional feed aggregator

### Day 3: Learning Roadmap (6 hours)

#### Morning (3h)
1. **Roadmap Data**
   - Seed initial roadmaps
   - Progress tracking logic
   - Database queries
   - State management

2. **Roadmap UI**
   - Stage list with checkboxes
   - Progress visualization
   - Resource links
   - Responsive layout

#### Afternoon (3h)
3. **Interactivity**
   - Stage completion tracking
   - Progress persistence
   - Visual feedback
   - Context preparation for AI

**Deliverables**: Interactive learning paths with progress

### Day 4: AI Chat Integration (6 hours)

#### Morning (3h)
1. **OpenAI Integration**
   - API wrapper with error handling
   - Context injection system
   - Message formatting
   - Rate limiting

2. **Chat UI**
   - Message bubbles
   - Input handling
   - Loading states
   - Auto-scroll

#### Afternoon (3h)
3. **Context Awareness**
   - Roadmap context injection
   - Feed summaries
   - Smart prompting
   - Error handling

**Deliverables**: Contextual AI assistant

### Day 5: Progress Tracker & Polish (6 hours)

#### Morning (3h)
1. **Tracker Features**
   - Daily goal setting
   - Streak calculation
   - Data visualization
   - Export functionality

2. **Polish & Testing**
   - Animation refinements
   - Keyboard shortcuts
   - Performance optimization
   - Cross-browser testing

#### Afternoon (3h)
3. **Final Deployment**
   - Production build
   - Environment setup
   - Monitoring setup
   - Documentation

**Deliverables**: Complete MVP with all features polished

---

## Component Specifications

### Core Components

#### Navigation Component
```svelte
<!-- Features -->
- Active tab highlighting
- Smooth transitions
- Mobile hamburger menu
- Keyboard navigation (Tab, Arrow keys)
```

#### FeedCard Component
```svelte
<!-- Props -->
- source: string
- items: FeedItem[]
- category: 'news' | 'research' | 'community'

<!-- Features -->
- Collapsible with animation
- Shows 5 items by default
- Relative timestamps
- Hover states
```

#### ProgressBar Component
```svelte
<!-- Props -->
- value: number (0-100)
- label: string
- showPercentage: boolean

<!-- Features -->
- Smooth animation on change
- Color variants (blue, green)
- Accessible ARIA labels
```

#### ChatMessage Component
```svelte
<!-- Props -->
- role: 'user' | 'assistant'
- content: string
- timestamp: Date

<!-- Features -->
- Markdown rendering
- Code syntax highlighting
- Copy button for code blocks
```

### Design System

#### Colors
```css
--color-primary: #3B82F6;     /* Blue 500 */
--color-success: #10B981;     /* Green 500 */
--color-warning: #F59E0B;     /* Amber 500 */
--color-error: #EF4444;       /* Red 500 */

--zen-gray-50: #FAFAFA;
--zen-gray-100: #F5F5F5;
--zen-gray-200: #E5E5E5;
--zen-gray-300: #D4D4D4;
--zen-gray-400: #A3A3A3;
--zen-gray-500: #737373;
--zen-gray-600: #525252;
--zen-gray-700: #404040;
--zen-gray-800: #262626;
--zen-gray-900: #171717;
```

#### Typography
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
```

#### Spacing
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
```

---

## API Documentation

### Feed Endpoints

#### GET /api/feeds
Fetch cached feeds from database
```typescript
Response: {
  success: boolean;
  items: FeedItem[];
  error?: string;
}
```

#### GET /api/feeds?action=refresh
Refresh feeds from all sources
```typescript
Response: {
  success: boolean;
  message: string;
  details: RefreshResult[];
}
```

### OpenAI Integration

#### POST /api/chat
Send message with context
```typescript
Request: {
  messages: ChatMessage[];
  context: {
    type: 'general' | 'roadmap' | 'feeds';
    data?: any;
  };
}

Response: {
  message: string;
  error?: string;
}
```

### Edge Function Structure
```javascript
// api/feeds.ts
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS headers
  // Rate limiting
  // Request handling
  // Error boundaries
}
```

---

## Deployment Strategy

### Environment Variables
```bash
# .env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "api/*.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "PUBLIC_SUPABASE_URL": "@supabase_url",
    "PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "OPENAI_API_KEY": "@openai_api_key"
  }
}
```

### CI/CD Pipeline
1. Push to main branch
2. Vercel auto-deploys preview
3. Run tests (if any)
4. Deploy to production
5. Invalidate CDN cache

### Monitoring
- Vercel Analytics for performance
- Supabase Dashboard for database
- Browser error tracking (future)

---

## Post-MVP Roadmap

### Phase 1: Enhanced Learning (Week 2-3)
- **Custom Roadmaps**: User-created learning paths
- **Roadmap Sharing**: Public roadmap library
- **Progress Analytics**: Learning insights dashboard
- **Spaced Repetition**: Review reminders

### Phase 2: Intelligence Layer (Week 4-5)
- **LangChain Integration**: Advanced AI orchestration
- **Smart Summaries**: AI-powered feed digests
- **Learning Recommendations**: Personalized content
- **Voice Notes**: Audio learning logs

### Phase 3: Collaboration (Week 6-8)
- **Study Groups**: Shared learning paths
- **Progress Sharing**: Public profiles
- **Comments**: Discussion on resources
- **Achievements**: Gamification elements

### Phase 4: Advanced Features (Month 3+)
- **Knowledge Graph**: Visual learning connections
- **API Access**: Developer integration
- **Mobile Apps**: iOS/Android native
- **Browser Extension**: Quick capture

### Technical Debt & Improvements
- Add comprehensive test suite
- Implement proper error tracking
- Add performance monitoring
- Create component documentation
- Build accessibility features
- Add internationalization

---

## Success Metrics

### MVP Success Criteria
- [ ] All 4 tabs functional
- [ ] Feeds refresh reliably
- [ ] Progress saves correctly
- [ ] AI chat provides value
- [ ] Clean, calm interface
- [ ] Mobile responsive
- [ ] Fast load times (<2s)
- [ ] No critical bugs

### Long-term Success Metrics
- Daily Active Users
- 7-day retention rate
- Average session duration
- Roadmap completion rate
- User satisfaction score
- Feature adoption rate

---

## Development Guidelines

### Code Style
- Use TypeScript for type safety (post-MVP)
- Follow Svelte conventions
- Meaningful component names
- Comments for complex logic
- Consistent formatting

### Git Workflow
```bash
main
├── feat/feeds
├── feat/roadmap
├── feat/chat
└── feat/tracker
```

### Commit Convention
```
feat: Add feed refresh functionality
fix: Resolve progress tracking bug
style: Update button hover states
docs: Add API documentation
```

### Testing Strategy
- Manual testing during MVP
- E2E tests with Playwright (post-MVP)
- Component tests with Vitest
- API endpoint testing

---

## Conclusion

LearningOS is designed to be a calm, focused space for serious learners. By following this implementation guide, you'll create an MVP that:

1. **Respects the user's attention** with minimal, thoughtful design
2. **Provides real value** through curated feeds and structured learning
3. **Scales gracefully** with a solid technical foundation
4. **Ships quickly** with a focused 5-day sprint

Remember: The goal is not to build every possible feature, but to create a tool that genuinely helps people learn better. Every decision should support that mission.

**Build with intention. Ship with pride. Learn with joy.**