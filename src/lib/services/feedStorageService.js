import { supabase } from '../supabase.js';
import { FEED_SOURCES } from '../feedSources.js';

/**
 * Clean Supabase-only Feed Storage Service
 * Manages both default feed preferences and custom feeds in the database
 */
class FeedStorageService {
  /**
   * Initialize default feeds for a user (called on first login)
   */
  async initializeDefaultFeeds(userId) {
    if (!userId) throw new Error('userId is required');

    try {
      // Check if user already has feeds
      const { data: existing } = await supabase
        .from('user_feeds')
        .select('feed_key')
        .eq('user_id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        return; // User already has feeds initialized
      }

      // Insert default feeds
      const defaultFeeds = Object.entries(FEED_SOURCES).map(([key, source]) => ({
        user_id: userId,
        feed_key: key,
        feed_name: key,
        feed_url: source.url,
        feed_category: source.category || 'news',
        feed_description: source.description || '',
        is_enabled: true,
        is_custom: false
      }));

      const { error } = await supabase
        .from('user_feeds')
        .insert(defaultFeeds);

      if (error) throw error;

      console.log(`✅ Initialized ${defaultFeeds.length} default feeds for user ${userId}`);
    } catch (error) {
      console.error('Failed to initialize default feeds:', error);
      throw error;
    }
  }

  /**
   * Get all feed sources for a user
   */
  async getFeedSources(userId) {
    if (!userId) throw new Error('userId is required');

    try {
      const { data, error } = await supabase
        .from('user_feeds')
        .select('*')
        .eq('user_id', userId)
        .order('is_custom', { ascending: true }) // Default feeds first
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // If no feeds found, initialize defaults
      if (!data || data.length === 0) {
        await this.initializeDefaultFeeds(userId);
        return this.getFeedSources(userId); // Recursive call after initialization
      }

      return data.map(feed => ({
        id: feed.feed_key,
        feedKey: feed.feed_key,
        name: feed.feed_name,
        url: feed.feed_url,
        category: feed.feed_category,
        description: feed.feed_description,
        active: feed.is_enabled,
        isCustom: feed.is_custom,
        createdAt: feed.created_at,
        updatedAt: feed.updated_at
      }));
    } catch (error) {
      console.error('Error fetching feed sources:', error);
      throw error;
    }
  }

  /**
   * Get only enabled feed sources for a user (for feed fetching)
   */
  async getEnabledFeedSources(userId) {
    const allSources = await this.getFeedSources(userId);
    return allSources.filter(source => source.active);
  }

  /**
   * Toggle feed enabled/disabled state
   */
  async toggleFeedState(userId, feedKey) {
    if (!userId || !feedKey) throw new Error('userId and feedKey are required');

    try {
      // Get current state
      const { data: current, error: fetchError } = await supabase
        .from('user_feeds')
        .select('is_enabled')
        .eq('user_id', userId)
        .eq('feed_key', feedKey)
        .single();

      if (fetchError) throw fetchError;

      // Toggle state
      const newState = !current.is_enabled;
      
      const { error: updateError } = await supabase
        .from('user_feeds')
        .update({ is_enabled: newState })
        .eq('user_id', userId)
        .eq('feed_key', feedKey);

      if (updateError) throw updateError;

      return newState;
    } catch (error) {
      console.error('Error toggling feed state:', error);
      throw error;
    }
  }

  /**
   * Add a custom feed
   */
  async addCustomFeed(userId, feedData) {
    if (!userId) throw new Error('userId is required');
    if (!feedData.name || !feedData.url) throw new Error('Feed name and URL are required');

    try {
      const customId = `custom_${Date.now()}`;
      
      const { data, error } = await supabase
        .from('user_feeds')
        .insert({
          user_id: userId,
          feed_key: customId,
          feed_name: feedData.name.trim(),
          feed_url: feedData.url.trim(),
          feed_category: 'custom',
          feed_description: `Custom feed: ${feedData.name.trim()}`,
          is_enabled: true,
          is_custom: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.feed_key,
        feedKey: data.feed_key,
        name: data.feed_name,
        url: data.feed_url,
        category: data.feed_category,
        description: data.feed_description,
        active: data.is_enabled,
        isCustom: data.is_custom,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error adding custom feed:', error);
      throw error;
    }
  }

  /**
   * Remove a custom feed
   */
  async removeCustomFeed(userId, feedKey) {
    if (!userId || !feedKey) throw new Error('userId and feedKey are required');

    try {
      const { error } = await supabase
        .from('user_feeds')
        .delete()
        .eq('user_id', userId)
        .eq('feed_key', feedKey)
        .eq('is_custom', true); // Safety: only allow removing custom feeds

      if (error) throw error;
    } catch (error) {
      console.error('Error removing custom feed:', error);
      throw error;
    }
  }

  /**
   * Update a custom feed
   */
  async updateCustomFeed(userId, feedKey, updates) {
    if (!userId || !feedKey) throw new Error('userId and feedKey are required');

    try {
      const updateData = {};
      if (updates.name) updateData.feed_name = updates.name.trim();
      if (updates.url) updateData.feed_url = updates.url.trim();
      if (updates.description) updateData.feed_description = updates.description.trim();

      const { error } = await supabase
        .from('user_feeds')
        .update(updateData)
        .eq('user_id', userId)
        .eq('feed_key', feedKey)
        .eq('is_custom', true); // Safety: only allow updating custom feeds

      if (error) throw error;
    } catch (error) {
      console.error('Error updating custom feed:', error);
      throw error;
    }
  }

  /**
   * Get feed statistics for a user
   */
  async getFeedStats(userId) {
    if (!userId) throw new Error('userId is required');

    try {
      const { data, error } = await supabase
        .from('user_feeds')
        .select('is_enabled, is_custom')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total: data.length,
        enabled: data.filter(f => f.is_enabled).length,
        disabled: data.filter(f => !f.is_enabled).length,
        custom: data.filter(f => f.is_custom).length,
        default: data.filter(f => !f.is_custom).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting feed stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const feedStorageService = new FeedStorageService();
