// Feed caching system using localStorage
const CACHE_KEY = 'learningos_feeds_cache';
const CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function getCachedFeeds() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = new Date().getTime();
    
    // Check if cache is expired
    if (now - new Date(data.timestamp).getTime() > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to get cached feeds:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export function setCachedFeeds(feedData) {
  try {
    const cacheData = {
      ...feedData,
      cachedAt: new Date().toISOString()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.warn('Failed to cache feeds:', error);
    return false;
  }
}

export function clearFeedCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch (error) {
    console.warn('Failed to clear feed cache:', error);
    return false;
  }
}

export function isCacheExpired() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return true;
    
    const data = JSON.parse(cached);
    const now = new Date().getTime();
    
    return now - new Date(data.timestamp).getTime() > CACHE_EXPIRY_MS;
  } catch (error) {
    return true;
  }
}

export function getCacheAge() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = new Date().getTime();
    const cacheTime = new Date(data.timestamp).getTime();
    
    return Math.floor((now - cacheTime) / 1000); // Age in seconds
  } catch (error) {
    return null;
  }
}