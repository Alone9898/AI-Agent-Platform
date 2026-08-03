export const WEB_SEARCH_PROVIDERS = [
  {
    key: 'bocha',
    name: '博查 Web Search',
    description: '面向中文与中国境内网络环境的搜索 API',
    region: '中国境内优先',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://open.bochaai.com/',
  },
  {
    key: 'tavily',
    name: 'Tavily',
    description: '适合国际网络环境的 AI 搜索 API',
    region: '国际网络',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyUrl: 'https://app.tavily.com/home',
  },
  {
    key: 'searxng',
    name: 'SearXNG',
    description: '连接用户自建或企业部署的开源搜索服务',
    region: '自建服务',
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
