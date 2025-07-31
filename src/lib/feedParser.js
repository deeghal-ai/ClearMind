import { FEED_SOURCES, RSS_PROXY_SERVICES } from './feedSources.js';

// Parse RSS XML to JSON
export function parseRSSXML(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse RSS XML');
  }
  
  const items = Array.from(doc.querySelectorAll('item')).map(item => {
    const title = item.querySelector('title')?.textContent || '';
    const description = item.querySelector('description')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const guid = item.querySelector('guid')?.textContent || link;
    
    return {
      title: cleanText(title),
      description: cleanDescription(description),
      link: link.trim(),
      pubDate: pubDate,
      guid: guid,
      timestamp: parseDate(pubDate)
    };
  });
  
  return items.slice(0, 10); // Limit to 10 items per feed
}

// Clean and format text content
function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, (match) => { // Decode HTML entities
      const entities = {
        '&amp;': '&',
        '&lt;': '<', 
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
      };
      return entities[match] || match;
    })
    .trim();
}

// Clean and truncate description
function cleanDescription(description) {
  const cleaned = cleanText(description);
  return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
}

// Parse various date formats
function parseDate(dateString) {
  if (!dateString) return new Date();
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
}

// Fetch feed with CORS proxy
export async function fetchFeed(sourceName) {
  const source = FEED_SOURCES[sourceName];
  if (!source) {
    throw new Error(`Unknown feed source: ${sourceName}`);
  }
  
  const errors = [];
  
  // Try each proxy service
  for (const proxyUrl of RSS_PROXY_SERVICES) {
    try {
      const response = await fetch(proxyUrl + encodeURIComponent(source.url), {
        headers: {
          'User-Agent': 'LearningOS/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle rss2json format
      if (data.items && Array.isArray(data.items)) {
        return data.items.slice(0, 10).map(item => ({
          title: cleanText(item.title || ''),
          description: cleanDescription(item.description || item.content || ''),
          link: item.link || item.url || '',
          pubDate: item.pubDate || item.isoDate || '',
          guid: item.guid || item.link || '',
          timestamp: parseDate(item.pubDate || item.isoDate)
        }));
      }
      
      // Handle raw RSS XML response
      if (typeof data === 'string' || data.contents) {
        const xmlContent = data.contents || data;
        return parseRSSXML(xmlContent);
      }
      
      throw new Error('Unexpected response format');
      
    } catch (error) {
      errors.push(`${proxyUrl}: ${error.message}`);
      continue;
    }
  }
  
  // If all proxies fail, try direct fetch (will likely fail due to CORS)
  try {
    const response = await fetch(source.url);
    if (response.ok) {
      const xmlText = await response.text();
      return parseRSSXML(xmlText);
    }
  } catch (directError) {
    errors.push(`Direct fetch: ${directError.message}`);
  }
  
  throw new Error(`All feed fetching methods failed for ${sourceName}:\n${errors.join('\n')}`);
}

// Fetch all feeds
export async function fetchAllFeeds() {
  const feedPromises = Object.keys(FEED_SOURCES).map(async (sourceName) => {
    try {
      const items = await fetchFeed(sourceName);
      return {
        source: sourceName,
        items,
        success: true,
        error: null,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`Failed to fetch ${sourceName}:`, error.message);
      return {
        source: sourceName,
        items: [],
        success: false,
        error: error.message,
        fetchedAt: new Date().toISOString()
      };
    }
  });
  
  const results = await Promise.all(feedPromises);
  
  return {
    feeds: results,
    timestamp: new Date().toISOString(),
    successCount: results.filter(r => r.success).length,
    totalCount: results.length
  };
}