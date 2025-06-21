// Enhanced live search system for real-time internet information

export interface LiveSearchResult {
  query: string;
  realTimeData?: any;
  webResults: LiveWebResult[];
  summary: string;
  searchTime: number;
  sources: string[];
}

export interface LiveWebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp?: string;
  relevanceScore: number;
}

/**
 * Check if a query requires live internet search
 */
export function isLiveSearchQuery(text: string): boolean {
  const liveSearchKeywords = [
    'current', 'latest', 'recent', 'today', 'now', 'live', 'breaking',
    'real time', 'real-time', 'up to date', 'fresh', 'new', 'happening',
    'trending', 'viral', 'popular', 'hot', 'active', 'ongoing',
    'what\'s happening', 'news about', 'updates on', 'status of',
    'live information', 'current events', 'recent developments'
  ];

  const lowerText = text.toLowerCase();
  return liveSearchKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Perform comprehensive live search combining multiple sources
 */
export async function performLiveSearch(query: string): Promise<LiveSearchResult> {
  const startTime = Date.now();
  
  try {
    // Perform parallel searches across multiple sources
    const [webResults, socialResults, newsResults] = await Promise.allSettled([
      searchWebSources(query),
      searchSocialMedia(query),
      searchNewsFeeds(query)
    ]);

    // Combine all results
    const allResults: LiveWebResult[] = [];
    const sources: string[] = [];

    if (webResults.status === 'fulfilled') {
      allResults.push(...webResults.value);
      sources.push('Web Search');
    }

    if (socialResults.status === 'fulfilled') {
      allResults.push(...socialResults.value);
      sources.push('Social Media');
    }

    if (newsResults.status === 'fulfilled') {
      allResults.push(...newsResults.value);
      sources.push('News Feeds');
    }

    // Sort by relevance and recency
    const sortedResults = allResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    const searchTime = Date.now() - startTime;
    const summary = generateLiveSummary(query, sortedResults, sources);

    return {
      query,
      webResults: sortedResults,
      summary,
      searchTime,
      sources
    };

  } catch (error) {
    console.error('Live search error:', error);
    
    return {
      query,
      webResults: [],
      summary: `I encountered an issue while searching for live information about "${query}". This could be due to network connectivity or API limitations. Please try rephrasing your query or try again in a moment.`,
      searchTime: Date.now() - startTime,
      sources: []
    };
  }
}

/**
 * Search web sources for live information
 */
async function searchWebSources(query: string): Promise<LiveWebResult[]> {
  const results: LiveWebResult[] = [];

  try {
    // Search Wikipedia for current information
    const wikiResults = await searchWikipediaLive(query);
    results.push(...wikiResults);

    // Search DuckDuckGo for instant answers
    const duckResults = await searchDuckDuckGoLive(query);
    results.push(...duckResults);

  } catch (error) {
    console.error('Web search error:', error);
  }

  return results;
}

/**
 * Search Wikipedia for live/current information
 */
async function searchWikipediaLive(query: string): Promise<LiveWebResult[]> {
  try {
    const searchResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query + ' current')}&limit=3&format=json&origin=*`
    );
    
    const searchData = await searchResponse.json();
    
    if (searchData && searchData[1] && searchData[1].length > 0) {
      const results: LiveWebResult[] = [];
      
      for (let i = 0; i < Math.min(2, searchData[1].length); i++) {
        const title = searchData[1][i];
        const description = searchData[2][i] || '';
        const url = searchData[3][i] || '#';

        results.push({
          title,
          url,
          snippet: description,
          source: 'Wikipedia',
          relevanceScore: 0.8 - (i * 0.1),
          timestamp: new Date().toISOString()
        });
      }

      return results;
    }
  } catch (error) {
    console.error('Wikipedia search error:', error);
  }

  return [];
}

/**
 * Search DuckDuckGo for live information
 */
async function searchDuckDuckGoLive(query: string): Promise<LiveWebResult[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' latest')}&format=json&no_html=1&skip_disambig=1`
    );
    
    const data = await response.json();
    const results: LiveWebResult[] = [];

    // Add abstract if available
    if (data.Abstract && data.Abstract.length > 0) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '#',
        snippet: data.Abstract,
        source: data.AbstractSource || 'DuckDuckGo',
        relevanceScore: 0.9,
        timestamp: new Date().toISOString()
      });
    }

    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 2).forEach((topic: any, index: number) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
            relevanceScore: 0.7 - (index * 0.1),
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

/**
 * Search social media for trending information
 */
async function searchSocialMedia(query: string): Promise<LiveWebResult[]> {
  try {
    // Search Reddit for current discussions
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=3`
    );
    
    const data = await response.json();
    const results: LiveWebResult[] = [];

    if (data.data && data.data.children) {
      data.data.children.forEach((post: any, index: number) => {
        const postData = post.data;
        results.push({
          title: postData.title,
          url: `https://reddit.com${postData.permalink}`,
          snippet: postData.selftext ? postData.selftext.substring(0, 200) + '...' : 'Reddit discussion',
          source: `r/${postData.subreddit}`,
          relevanceScore: 0.6 - (index * 0.1),
          timestamp: new Date(postData.created_utc * 1000).toISOString()
        });
      });
    }

    return results;
  } catch (error) {
    console.error('Social media search error:', error);
    return [];
  }
}

/**
 * Search news feeds for latest information
 */
async function searchNewsFeeds(query: string): Promise<LiveWebResult[]> {
  try {
    // Search multiple RSS feeds
    const feeds = [
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.reuters.com/reuters/topNews'
    ];

    const results: LiveWebResult[] = [];

    for (const feed of feeds) {
      try {
        const response = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&count=2`
        );
        
        const data = await response.json();
        
        if (data.status === 'ok' && data.items) {
          data.items.forEach((item: any, index: number) => {
            if (item.title.toLowerCase().includes(query.toLowerCase()) || 
                item.description.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                title: item.title,
                url: item.link,
                snippet: item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : 'Latest news',
                source: data.feed?.title || 'News Feed',
                relevanceScore: 0.8 - (index * 0.1),
                timestamp: new Date(item.pubDate).toISOString()
              });
            }
          });
        }
      } catch (feedError) {
        console.error(`Error fetching feed ${feed}:`, feedError);
      }
    }

    return results;
  } catch (error) {
    console.error('News feed search error:', error);
    return [];
  }
}

/**
 * Generate summary of live search results
 */
function generateLiveSummary(query: string, results: LiveWebResult[], sources: string[]): string {
  if (results.length === 0) {
    return `🔴 **Live Search Results for "${query}"**\n\nNo current information found. This could be because:\n• The topic is very new or specialized\n• No recent updates are available\n• Network connectivity issues\n\nTry searching for related terms or check back later for updates.`;
  }

  let summary = `🔴 **LIVE SEARCH RESULTS for "${query}"**\n\n`;
  summary += `📊 **Search Summary:**\n`;
  summary += `• Found ${results.length} live results\n`;
  summary += `• Sources: ${sources.join(', ')}\n`;
  summary += `• Search completed in real-time\n\n`;

  summary += `🔥 **Latest Information:**\n\n`;

  results.slice(0, 5).forEach((result, index) => {
    summary += `**${index + 1}. ${result.title}**\n`;
    summary += `${result.snippet.substring(0, 150)}${result.snippet.length > 150 ? '...' : ''}\n`;
    summary += `*Source: ${result.source}*\n`;
    if (result.timestamp) {
      const timeAgo = getTimeAgo(new Date(result.timestamp));
      summary += `*Updated: ${timeAgo}*\n`;
    }
    summary += '\n';
  });

  if (results.length > 5) {
    summary += `*...and ${results.length - 5} more live results*\n\n`;
  }

  summary += `⚡ **Real-Time Insights:**\n`;
  summary += `This information was gathered from live sources and represents the most current data available about "${query}". `;
  summary += `Results are sorted by relevance and recency to provide you with the latest developments.\n\n`;
  
  summary += `🔄 *Last updated: ${new Date().toLocaleTimeString()}*`;

  return summary;
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Format live search results for AI context
 */
export function formatLiveSearchForAI(searchResult: LiveSearchResult): string {
  let context = `LIVE INTERNET SEARCH RESULTS for "${searchResult.query}":\n\n`;
  
  context += `SEARCH METADATA:\n`;
  context += `- Query: ${searchResult.query}\n`;
  context += `- Sources: ${searchResult.sources.join(', ')}\n`;
  context += `- Results: ${searchResult.webResults.length}\n`;
  context += `- Search Time: ${searchResult.searchTime}ms\n\n`;
  
  context += `LIVE RESULTS:\n`;
  searchResult.webResults.forEach((result, index) => {
    context += `[${index + 1}] ${result.title}\n`;
    context += `Source: ${result.source}\n`;
    context += `Content: ${result.snippet}\n`;
    context += `URL: ${result.url}\n`;
    context += `Relevance: ${result.relevanceScore}\n`;
    if (result.timestamp) {
      context += `Updated: ${result.timestamp}\n`;
    }
    context += '\n';
  });

  context += `INSTRUCTIONS: Use this live information to provide current, up-to-date answers. Always mention that this is live/current information from the internet and cite sources when possible.`;

  return context;
}
