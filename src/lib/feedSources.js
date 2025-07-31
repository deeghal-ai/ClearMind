// RSS feed sources for AI/ML content
export const FEED_SOURCES = {
  'HackerNews AI/ML': {
    url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+machine+learning+OR+artificial+intelligence',
    type: 'rss',
    category: 'news',
    description: 'Latest AI/ML discussions from Hacker News'
  },
  'ArXiv CS.AI': {
    url: 'http://export.arxiv.org/rss/cs.AI',
    type: 'rss', 
    category: 'research',
    description: 'Recent AI research papers from ArXiv'
  },
  'ArXiv CS.LG': {
    url: 'http://export.arxiv.org/rss/cs.LG',
    type: 'rss',
    category: 'research', 
    description: 'Machine Learning papers from ArXiv'
  },
  'Reddit r/MachineLearning': {
    url: 'https://www.reddit.com/r/MachineLearning/.rss',
    type: 'rss',
    category: 'community',
    description: 'Machine Learning community discussions'
  },
  'Reddit r/artificial': {
    url: 'https://www.reddit.com/r/artificial/.rss', 
    type: 'rss',
    category: 'community',
    description: 'General AI discussions and news'
  }
};

// RSS to JSON proxy services (to handle CORS)
export const RSS_PROXY_SERVICES = [
  'https://api.rss2json.com/v1/api.json?rss_url=',
  'https://rss-to-json-serverless-api.vercel.app/api?url='
];

export function getFeedDisplayName(sourceName) {
  return sourceName;
}

export function getFeedCategory(sourceName) {
  return FEED_SOURCES[sourceName]?.category || 'general';
}

export function getCategoryColor(category) {
  switch (category) {
    case 'news': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'research': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'community': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}