# Supabase Setup Guide for LearningOS

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign up or log in
3. Click "New Project"
4. Choose your organization and enter project details:
   - Name: `learningos` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your location
5. Click "Create new project"
6. Wait for project setup to complete (~2 minutes)

## Step 2: Configure Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy the entire contents of `database-schema.sql` from this project
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema creation
5. Verify that tables were created by going to **Table Editor**

You should see these tables:
- `roadmaps` - Contains learning roadmap data
- `user_progress` - Stage-level progress tracking
- `roadmap_progress` - Overall roadmap progress summaries

## Step 3: Update Application Configuration

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your project details:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJhbGci...`)

3. Open `src/lib/supabase.js` in your project
4. Replace the placeholder values:
   ```javascript
   const supabaseUrl = 'https://your-project-id.supabase.co'; // Replace with your Project URL
   const supabaseKey = 'your-anon-public-key-here'; // Replace with your anon public key
   ```

## Step 4: Test the Connection

1. Start your development server: `npm run dev`
2. Navigate to the Roadmap tab
3. You should see 4 roadmaps loaded from Supabase
4. Try checking/unchecking stage progress - it should persist when you refresh the page

## Step 5: Enable Row Level Security (Optional but Recommended)

For production use, enable RLS to secure your data:

1. Go to **Authentication** → **Settings** → **General**
2. Enable **Row Level Security** on all tables
3. Add policies for user access:

```sql
-- Enable RLS on tables
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read access to roadmaps (they're not user-specific)
CREATE POLICY "Allow public read access on roadmaps" ON roadmaps
  FOR SELECT USING (true);

-- Allow users to manage their own progress
CREATE POLICY "Users can manage their progress" ON user_progress
  FOR ALL USING (true); -- For now, allow all access

CREATE POLICY "Users can manage their roadmap progress" ON roadmap_progress
  FOR ALL USING (true); -- For now, allow all access
```

## Troubleshooting

### Error: "Invalid API key"
- Double-check that you copied the **anon public** key, not the service role key
- Ensure there are no extra spaces or characters

### Error: "Failed to load roadmaps"
- Check that the database schema was created successfully
- Verify your Project URL is correct
- Check browser console for detailed error messages

### Progress not saving
- Ensure you have a valid `userId` (should be set automatically)
- Check Network tab in browser dev tools for failed API calls
- Verify the triggers and functions were created in the database

### Empty roadmaps
- Make sure the INSERT statements in `database-schema.sql` executed successfully
- Check the `roadmaps` table in Supabase Table Editor

## Features Enabled

With Supabase setup, you now have:

✅ **Multi-device sync** - Your progress syncs across all your devices
✅ **Persistent storage** - Progress saved in the cloud
✅ **Stage-level tracking** - Individual stage completion with timestamps
✅ **Notes system** - Add personal notes to any stage
✅ **Statistics** - Overall learning progress across all roadmaps
✅ **Reset functionality** - Clear progress for any roadmap
✅ **Export progress** - Copy progress as markdown

## Next Steps

1. Consider setting up [authentication](https://supabase.com/docs/guides/auth) for user accounts
2. Add more roadmaps by inserting into the `roadmaps` table
3. Customize the roadmap content in the database
4. Deploy your app to Vercel or another hosting platform