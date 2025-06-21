// Real-time data utilities for the AI chat

export interface RealtimeData {
  currentTime: string
  currentDate: string
  timezone: string
  news?: NewsItem[]
  weather?: WeatherData
  stockMarket?: StockData
  cryptoPrices?: CryptoData[]
}

export interface NewsItem {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
}

export interface WeatherData {
  location: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
}

export interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
}

export interface CryptoData {
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
}

// Get current time and date information
export function getCurrentTimeData(): { currentTime: string; currentDate: string; timezone: string } {
  const now = new Date()
  
  return {
    currentTime: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    currentDate: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}

// Fetch latest news using multiple free sources
export async function getLatestNews(): Promise<NewsItem[]> {
  try {
    // Try multiple free news sources
    const newsResults = await Promise.allSettled([
      fetchHackerNews(),
      fetchRedditNews(),
      fetchRSSNews()
    ])

    const allNews: NewsItem[] = []

    newsResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allNews.push(...result.value)
      }
    })

    // If we got some news, return it, otherwise use mock data
    return allNews.length > 0 ? allNews.slice(0, 5) : getMockNews()
  } catch (error) {
    console.error('Error fetching news:', error)
    return getMockNews()
  }
}

// Fetch from Hacker News API (free, no API key required)
async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const storyIds = await response.json()

    // Get first 3 stories
    const stories = await Promise.all(
      storyIds.slice(0, 3).map(async (id: number) => {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        return storyResponse.json()
      })
    )

    return stories.map(story => ({
      title: story.title || 'Tech News',
      description: story.text ? story.text.substring(0, 200) + '...' : 'Latest technology news from Hacker News',
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      source: 'Hacker News',
      publishedAt: new Date(story.time * 1000).toLocaleString()
    }))
  } catch (error) {
    console.error('Error fetching Hacker News:', error)
    return []
  }
}

// Fetch from Reddit API (free, no API key required)
async function fetchRedditNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch('https://www.reddit.com/r/worldnews/hot.json?limit=3')
    const data = await response.json()

    return data.data.children.map((post: any) => ({
      title: post.data.title,
      description: post.data.selftext ? post.data.selftext.substring(0, 200) + '...' : 'Latest news from Reddit',
      url: post.data.url,
      source: 'Reddit',
      publishedAt: new Date(post.data.created_utc * 1000).toLocaleString()
    }))
  } catch (error) {
    console.error('Error fetching Reddit news:', error)
    return []
  }
}

// Fetch from RSS feeds (free)
async function fetchRSSNews(): Promise<NewsItem[]> {
  try {
    // Using RSS2JSON service to convert RSS to JSON
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/rss.xml&count=3')
    const data = await response.json()

    if (data.status === 'ok' && data.items) {
      return data.items.map((item: any) => ({
        title: item.title,
        description: item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : 'Latest news',
        url: item.link,
        source: 'BBC News',
        publishedAt: new Date(item.pubDate).toLocaleString()
      }))
    }

    return []
  } catch (error) {
    console.error('Error fetching RSS news:', error)
    return []
  }
}

// Mock news data for when API is not available
function getMockNews(): NewsItem[] {
  return [
    {
      title: "Technology Advances in AI Continue to Shape Industries",
      description: "Latest developments in artificial intelligence are transforming various sectors...",
      url: "#",
      source: "Tech News",
      publishedAt: new Date().toLocaleString()
    },
    {
      title: "Global Markets Show Mixed Results Today",
      description: "Stock markets around the world display varied performance...",
      url: "#",
      source: "Financial Times",
      publishedAt: new Date(Date.now() - 3600000).toLocaleString()
    },
    {
      title: "Climate Change Summit Reaches New Agreements",
      description: "World leaders announce new initiatives for environmental protection...",
      url: "#",
      source: "World News",
      publishedAt: new Date(Date.now() - 7200000).toLocaleString()
    }
  ]
}

// Get weather data (using a free weather API)
export async function getWeatherData(location: string = 'New York'): Promise<WeatherData | null> {
  try {
    // Using OpenWeatherMap API (free tier available)
    const API_KEY = 'your_weather_api_key_here' // Replace with actual API key
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=metric`
    )
    
    if (!response.ok) {
      return getMockWeather()
    }
    
    const data = await response.json()
    
    return {
      location: data.name,
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return getMockWeather()
  }
}

// Mock weather data
function getMockWeather(): WeatherData {
  return {
    location: 'New York',
    temperature: 22,
    condition: 'partly cloudy',
    humidity: 65,
    windSpeed: 8
  }
}

// Get cryptocurrency prices (using CoinGecko API - no API key required)
export async function getCryptoPrices(): Promise<CryptoData[]> {
  try {
    // Using CoinGecko API (free tier available, no API key required)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,dogecoin,solana&vs_currencies=usd&include_24hr_change=true',
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) {
      console.log('CoinGecko API failed, using mock data')
      return getMockCrypto()
    }

    const data = await response.json()

    const cryptos = []

    if (data.bitcoin) {
      cryptos.push({
        symbol: 'BTC',
        name: 'Bitcoin',
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change || 0,
        changePercent24h: data.bitcoin.usd_24h_change || 0
      })
    }

    if (data.ethereum) {
      cryptos.push({
        symbol: 'ETH',
        name: 'Ethereum',
        price: data.ethereum.usd,
        change24h: data.ethereum.usd_24h_change || 0,
        changePercent24h: data.ethereum.usd_24h_change || 0
      })
    }

    if (data.cardano) {
      cryptos.push({
        symbol: 'ADA',
        name: 'Cardano',
        price: data.cardano.usd,
        change24h: data.cardano.usd_24h_change || 0,
        changePercent24h: data.cardano.usd_24h_change || 0
      })
    }

    if (data.dogecoin) {
      cryptos.push({
        symbol: 'DOGE',
        name: 'Dogecoin',
        price: data.dogecoin.usd,
        change24h: data.dogecoin.usd_24h_change || 0,
        changePercent24h: data.dogecoin.usd_24h_change || 0
      })
    }

    if (data.solana) {
      cryptos.push({
        symbol: 'SOL',
        name: 'Solana',
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change || 0,
        changePercent24h: data.solana.usd_24h_change || 0
      })
    }

    return cryptos.length > 0 ? cryptos : getMockCrypto()
  } catch (error) {
    console.error('Error fetching crypto prices:', error)
    return getMockCrypto()
  }
}

// Mock crypto data
function getMockCrypto(): CryptoData[] {
  return [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 45000,
      change24h: 1200,
      changePercent24h: 2.74
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3200,
      change24h: -45,
      changePercent24h: -1.39
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      price: 0.85,
      change24h: 0.02,
      changePercent24h: 2.41
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      price: 0.12,
      change24h: 0.008,
      changePercent24h: 7.14
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 95.50,
      change24h: -2.30,
      changePercent24h: -2.35
    }
  ]
}

// Get comprehensive real-time data
export async function getRealtimeData(): Promise<RealtimeData> {
  const timeData = getCurrentTimeData()
  
  try {
    const [news, weather, crypto] = await Promise.all([
      getLatestNews(),
      getWeatherData(),
      getCryptoPrices()
    ])
    
    return {
      ...timeData,
      news,
      weather: weather || undefined,
      cryptoPrices: crypto
    }
  } catch (error) {
    console.error('Error fetching realtime data:', error)
    return {
      ...timeData,
      news: getMockNews(),
      weather: getMockWeather(),
      cryptoPrices: getMockCrypto()
    }
  }
}

// Format real-time data for AI response
export function formatRealtimeDataForAI(data: RealtimeData): string {
  let formatted = `🕐 **REAL-TIME INFORMATION UPDATE**\n\n`
  
  // Time and Date
  formatted += `**📅 Current Time & Date:**\n`
  formatted += `• Time: ${data.currentTime}\n`
  formatted += `• Date: ${data.currentDate}\n`
  formatted += `• Timezone: ${data.timezone}\n\n`
  
  // Weather
  if (data.weather) {
    formatted += `**🌤️ Weather in ${data.weather.location}:**\n`
    formatted += `• Temperature: ${data.weather.temperature}°C\n`
    formatted += `• Condition: ${data.weather.condition}\n`
    formatted += `• Humidity: ${data.weather.humidity}%\n`
    formatted += `• Wind Speed: ${data.weather.windSpeed} m/s\n\n`
  }
  
  // Cryptocurrency Prices
  if (data.cryptoPrices && data.cryptoPrices.length > 0) {
    formatted += `**₿ Cryptocurrency Prices:**\n`
    data.cryptoPrices.forEach(crypto => {
      const changeIcon = crypto.changePercent24h >= 0 ? '📈' : '📉'
      const changeColor = crypto.changePercent24h >= 0 ? '+' : ''
      formatted += `• ${crypto.symbol}: $${crypto.price.toLocaleString()} ${changeIcon} ${changeColor}${crypto.changePercent24h.toFixed(2)}%\n`
    })
    formatted += '\n'
  }
  
  // Latest News
  if (data.news && data.news.length > 0) {
    formatted += `**📰 Latest News Headlines:**\n`
    data.news.slice(0, 3).forEach((item, index) => {
      formatted += `${index + 1}. **${item.title}**\n`
      formatted += `   Source: ${item.source} | ${item.publishedAt}\n\n`
    })
  }
  
  formatted += `*Last updated: ${data.currentTime}*`
  
  return formatted
}
