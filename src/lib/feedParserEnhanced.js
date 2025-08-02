import { XMLParser } from 'fast-xml-parser';
import { FEED_SOURCES } from './feedSources.js';

// Enhanced RSS parser using fast-xml-parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false
});

export function cleanHTML(html) {
  if (!html) return '';
  
  // Remove HTML tags and decode entities
  let text = html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, (match) => { // Decode HTML entities
      const entities = {
        '&amp;': '&',
        '&lt;': '<', 
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' ',
        '&hellip;': '...',
        '&mdash;': '—',
        '&ndash;': '–'
      };
      return entities[match] || match;
    })
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Truncate to reasonable length
  return text.length > 250 ? text.substring(0, 247) + '...' : text;
}

export function parseRSSDate(dateStr) {
  if (!dateStr) return new Date();
  
  // Handle various RSS date formats
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

export async function parseRSSXML(xmlText, sourceUrl = '') {
  try {
    const result = parser.parse(xmlText);
    
    // Handle different RSS/Atom formats
    const channel = result.rss?.channel || result.feed;
    if (!channel) {
      throw new Error('Invalid RSS/Atom format');
    }
    
    const items = channel.item || channel.entry || [];
    const itemsArray = Array.isArray(items) ? items : [items];
    
    return itemsArray.map(item => {
      // RSS 2.0 format
      if (item.title && (item.link || item.guid)) {
        return {
          title: extractText(item.title),
          link: extractText(item.link) || extractText(item.guid),
          description: cleanHTML(extractText(item.description) || extractText(item.summary)),
          pubDate: parseRSSDate(extractText(item.pubDate)),
          guid: extractText(item.guid) || extractText(item.link) || Math.random().toString(),
          author: extractText(item.author) || extractText(item['dc:creator'])
        };
      }
      
      // Atom format
      if (item.title && (item.id || item.link)) {
        return {
          title: extractText(item.title),
          link: item.link?.['@_href'] || extractText(item.id),
          description: cleanHTML(extractText(item.summary) || extractText(item.content)),
          pubDate: parseRSSDate(extractText(item.updated) || extractText(item.published)),
          guid: extractText(item.id) || Math.random().toString(),
          author: extractText(item.author?.name)
        };
      }
      
      return null;
    }).filter(Boolean).slice(0, 15); // Limit to 15 items per feed
    
  } catch (error) {
    console.error('Feed parsing error:', error);
    throw new Error(`Failed to parse RSS: ${error.message}`);
  }
}

function extractText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value['#text']) return value['#text'];
  if (typeof value === 'object' && value.toString) return value.toString();
  return '';
}

// Enhanced feed fetching with multiple fallback strategies
export async function fetchFeedWithFallbacks(sourceName) {
  const source = FEED_SOURCES[sourceName];
  if (!source) {
    throw new Error(`Unknown feed source: ${sourceName}`);
  }
  
  const errors = [];
  const strategies = [
    // Strategy 1: RSS2JSON service with better error handling
    async () => {
      const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(proxyUrl + encodeURIComponent(source.url), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'LearningOS/1.0 RSS Reader'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        if (data.status !== 'ok') {
          throw new Error(data.message || `RSS2JSON error: ${data.status}`);
        }
        
        if (!data.items || data.items.length === 0) {
          throw new Error('No items found in feed');
        }
        
        return data.items.slice(0, 15).map(item => ({
          title: item.title || 'Untitled',
          link: item.link || item.url || '',
          description: cleanHTML(item.description || item.content || ''),
          pubDate: parseRSSDate(item.pubDate || item.isoDate),
          guid: item.guid || item.link || Math.random().toString(),
          author: item.author
        }));
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    
    // Strategy 2: AllOrigins proxy
    async () => {
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const response = await fetch(proxyUrl + encodeURIComponent(source.url), {
        timeout: 8000
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const xmlText = await response.text();
      return await parseRSSXML(xmlText, source.url);
    },
    
    // Strategy 3: RSS-to-JSON serverless
    async () => {
      const proxyUrl = 'https://rss-to-json-serverless-api.vercel.app/api?url=';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(proxyUrl + encodeURIComponent(source.url), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'LearningOS/1.0 RSS Reader'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        if (!data.items || data.items.length === 0) {
          throw new Error('No items found in response');
        }
        
        return data.items.slice(0, 15).map(item => ({
          title: item.title || 'Untitled',
          link: item.link || '',
          description: cleanHTML(item.description || ''),
          pubDate: parseRSSDate(item.pubDate),
          guid: item.guid || item.link || Math.random().toString(),
          author: item.author
        }));
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    
    // Strategy 4: Direct CORS proxy attempt
    async () => {
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await fetch(proxyUrl + source.url, {
          signal: controller.signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'LearningOS/1.0 RSS Reader'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const xmlText = await response.text();
        if (!xmlText || xmlText.length < 100) {
          throw new Error('Invalid or empty XML response');
        }
        
        const items = await parseRSSXML(xmlText, source.url);
        if (!items || items.length === 0) {
          throw new Error('No items parsed from XML');
        }
        
        return items;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
  ];
  
  // Try each strategy
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`🔄 Trying strategy ${i + 1} for ${sourceName}: ${source.url}`);
      const items = await strategies[i]();
      if (items && items.length > 0) {
        console.log(`✅ Strategy ${i + 1} succeeded for ${sourceName}: ${items.length} items`);
        return items;
      } else {
        errors.push(`Strategy ${i + 1}: No items returned`);
      }
    } catch (error) {
      const errorMsg = `Strategy ${i + 1}: ${error.message}`;
      console.warn(`❌ ${errorMsg} for ${sourceName}`);
      errors.push(errorMsg);
      continue;
    }
  }
  
  const finalError = `🚨 ALL STRATEGIES FAILED for "${sourceName}" (${source.url}):\n${errors.map((err, idx) => `  ${idx + 1}. ${err}`).join('\n')}`;
  console.error(finalError);
  throw new Error(finalError);
}

// Fetch all feeds with enhanced error handling
export async function fetchAllFeedsEnhanced() {
  const feedPromises = Object.keys(FEED_SOURCES).map(async (sourceName) => {
    try {
      const items = await fetchFeedWithFallbacks(sourceName);
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
  
  const results = await Promise.allSettled(feedPromises);
  const feeds = results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
  
  return {
    feeds,
    timestamp: new Date().toISOString(),
    successCount: feeds.filter(f => f.success).length,
    totalCount: feeds.length
  };
}

// Utility to group feeds by source with enhanced metadata
export function groupFeedsByCategory(feeds) {
  const grouped = {
    news: [],
    research: [],
    community: []
  };
  
  feeds.forEach(feed => {
    if (!feed.success || feed.items.length === 0) return;
    
    const category = FEED_SOURCES[feed.source]?.category || 'news';
    if (grouped[category]) {
      grouped[category].push({
        ...feed,
        categoryInfo: {
          color: getCategoryColor(category),
          icon: getCategoryIcon(category),
          name: getCategoryName(category)
        }
      });
    }
  });
  
  return grouped;
}

function getCategoryColor(category) {
  const colors = {
    news: 'blue',
    research: 'purple', 
    community: 'green'
  };
  return colors[category] || 'gray';
}

function getCategoryIcon(category) {
  const icons = {
    news: '📡',
    research: '🔬',
    community: '💬'
  };
  return icons[category] || '📄';
}

function getCategoryName(category) {
  const names = {
    news: 'News & Articles',
    research: 'Research Papers',
    community: 'Community Discussions'
  };
  return names[category] || 'General';
}