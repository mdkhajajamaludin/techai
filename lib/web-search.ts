// Web search utilities for deep search functionality

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface DeepSearchResult {
  query: string;
  results: SearchResult[];
  summary: string;
  totalResults: number;
  searchTime: number;
}

/**
 * Check if a query requires deep web search
 */
export function isDeepSearchQuery(text: string): boolean {
  const deepSearchKeywords = [
    'search for', 'find information about', 'look up', 'research',
    'what is the latest', 'recent developments', 'current status',
    'find articles about', 'search the web', 'deep search',
    'comprehensive information', 'detailed research', 'in-depth analysis',
    'latest news about', 'recent studies', 'current research',
    'find sources', 'web search', 'internet search', 'online research'
  ];

  const lowerText = text.toLowerCase();
  return deepSearchKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract search query from user input
 */
export function extractSearchQuery(text: string): string {
  // Remove common search prefixes
  const prefixes = [
    'search for', 'find information about', 'look up', 'research',
    'what is the latest', 'find articles about', 'search the web',
    'deep search', 'find sources about', 'web search for'
  ];

  let query = text.toLowerCase();
  
  for (const prefix of prefixes) {
    if (query.startsWith(prefix)) {
      query = query.substring(prefix.length).trim();
      break;
    }
  }

  // Clean up the query
  query = query.replace(/[?!.]+$/, '').trim();
  
  return query || text;
}

/**
 * Perform web search using multiple search engines
 */
export async function performDeepSearch(query: string): Promise<DeepSearchResult> {
  const startTime = Date.now();
  
  try {
    // Use DuckDuckGo Instant Answer API (free and doesn't require API key)
    const searchResults = await searchDuckDuckGo(query);
    
    // If DuckDuckGo doesn't return enough results, try alternative methods
    if (searchResults.length < 3) {
      const additionalResults = await searchAlternative(query);
      searchResults.push(...additionalResults);
    }

    const searchTime = Date.now() - startTime;

    // Generate summary of search results
    const summary = generateSearchSummary(query, searchResults);

    return {
      query,
      results: searchResults.slice(0, 10), // Limit to top 10 results
      summary,
      totalResults: searchResults.length,
      searchTime
    };

  } catch (error) {
    console.error('Deep search error:', error);
    
    // Return fallback result
    return {
      query,
      results: [],
      summary: `I encountered an issue while searching for "${query}". This could be due to network connectivity or search service limitations. Please try rephrasing your query or ask me to search for something else.`,
      totalResults: 0,
      searchTime: Date.now() - startTime
    };
  }
}

/**
 * Search using DuckDuckGo Instant Answer API
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    // DuckDuckGo Instant Answer API
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await response.json();

    const results: SearchResult[] = [];

    // Add abstract if available
    if (data.Abstract && data.Abstract.length > 0) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '#',
        snippet: data.Abstract,
        source: data.AbstractSource || 'DuckDuckGo'
      });
    }

    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo'
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
 * Alternative search method using Wikipedia API
 */
async function searchAlternative(query: string): Promise<SearchResult[]> {
  try {
    // Wikipedia search API
    const searchResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      
      if (data.extract) {
        return [{
          title: data.title,
          url: data.content_urls?.desktop?.page || '#',
          snippet: data.extract,
          source: 'Wikipedia'
        }];
      }
    }

    // If direct page doesn't exist, try search
    const searchListResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`);
    const searchData = await searchListResponse.json();

    if (searchData && searchData[1] && searchData[1].length > 0) {
      const results: SearchResult[] = [];
      
      for (let i = 0; i < Math.min(3, searchData[1].length); i++) {
        const title = searchData[1][i];
        const description = searchData[2][i] || '';
        const url = searchData[3][i] || '#';

        results.push({
          title,
          url,
          snippet: description,
          source: 'Wikipedia'
        });
      }

      return results;
    }

    return [];

  } catch (error) {
    console.error('Alternative search error:', error);
    return [];
  }
}

/**
 * Generate a summary of search results
 */
function generateSearchSummary(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `I couldn't find specific information about "${query}" through web search. This might be because:

• The topic is very new or specialized
• The search terms need to be more specific
• The information might be behind paywalls or in private databases
• Network connectivity issues

Try rephrasing your query or asking about related topics.`;
  }

  let summary = `🔍 **Deep Search Results for "${query}"**\n\n`;
  summary += `Found ${results.length} relevant sources:\n\n`;

  results.slice(0, 5).forEach((result, index) => {
    summary += `**${index + 1}. ${result.title}**\n`;
    summary += `${result.snippet.substring(0, 200)}${result.snippet.length > 200 ? '...' : ''}\n`;
    summary += `*Source: ${result.source}*\n\n`;
  });

  if (results.length > 5) {
    summary += `*...and ${results.length - 5} more sources*\n\n`;
  }

  summary += `💡 **Key Insights:**\n`;
  summary += `Based on the search results, here's what I found about "${query}":\n\n`;

  // Extract key information from snippets
  const allText = results.map(r => r.snippet).join(' ');
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyInsights = sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 0);

  keyInsights.forEach((insight, index) => {
    summary += `• ${insight}.\n`;
  });

  return summary;
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(searchResult: DeepSearchResult): string {
  let context = `DEEP SEARCH RESULTS for "${searchResult.query}":\n\n`;
  
  searchResult.results.forEach((result, index) => {
    context += `[${index + 1}] ${result.title}\n`;
    context += `Source: ${result.source}\n`;
    context += `Content: ${result.snippet}\n`;
    context += `URL: ${result.url}\n\n`;
  });

  context += `Search completed in ${searchResult.searchTime}ms with ${searchResult.totalResults} total results.\n\n`;
  context += `INSTRUCTIONS: Use this search information to provide a comprehensive answer. Cite sources when possible and mention that this information comes from web search.`;

  return context;
}
