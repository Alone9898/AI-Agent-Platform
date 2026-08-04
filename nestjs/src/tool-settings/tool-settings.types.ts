export const WEB_SEARCH_PROVIDERS = [
  {
    key: 'exa_mcp',
    name: 'Exa MCP',
    description: '无需 API Key 的公共 AI 搜索通道，适合开箱即用',
    region: '免密钥 · 国际网络',
    accessMode: 'public',
    requiresApiKey: false,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://exa.ai/',
  },
  {
    key: 'bing',
    name: 'Bing 公共搜索',
    description: '无需 API Key 读取公开搜索结果，可能受到限流或页面变更影响',
    region: '免密钥 · 中国大陆可用性较好',
    accessMode: 'public',
    requiresApiKey: false,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://www.bing.com/',
  },
  {
    key: 'duckduckgo',
    name: 'DuckDuckGo 公共搜索',
    description: '无需 API Key 读取公开搜索结果，部分网络环境可能无法访问',
    region: '免密钥 · 国际网络',
    accessMode: 'public',
    requiresApiKey: false,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://duckduckgo.com/',
  },
  {
    key: 'bocha',
    name: '博查 Web Search',
    description: '面向中文与中国境内网络环境的搜索 API',
    region: '中国境内优先',
    accessMode: 'byok',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://open.bochaai.com/',
  },
  {
    key: 'tavily',
    name: 'Tavily',
    description: '适合国际网络环境的 AI 搜索 API',
    region: '国际网络',
    accessMode: 'byok',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://app.tavily.com/home',
  },
  {
    key: 'serpapi',
    name: 'SerpAPI',
    description: '通过 SerpAPI 获取 Google 等搜索引擎结果',
    region: '用户自带 Key · 国际网络',
    accessMode: 'byok',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://serpapi.com/manage-api-key',
  },
  {
    key: 'searxng',
    name: 'SearXNG',
    description: '连接用户自建或企业部署的开源搜索服务',
    region: '自建服务',
    accessMode: 'self-hosted',
    requiresApiKey: false,
    requiresBaseUrl: true,
    apiKeyUrl: 'https://docs.searxng.org/',
  },
] as const;

export type WebSearchProviderKey = (typeof WEB_SEARCH_PROVIDERS)[number]['key'];

export interface WebSearchRuntimeConfig {
  provider: WebSearchProviderKey;
  apiKey?: string;
  baseUrl?: string;
}

export interface WebSearchPublicConfig {
  provider: WebSearchProviderKey | null;
  baseUrl: string | null;
  hasApiKey: boolean;
  configured: boolean;
  source: 'local' | 'environment' | 'none';
}
