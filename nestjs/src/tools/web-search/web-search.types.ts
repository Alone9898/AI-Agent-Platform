export interface WebSearchRequest {
  query: string;
  maxResults?: number;
}

export interface WebSearchProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

export interface WebSearchResponse {
  provider: string;
  query: string;
  results: WebSearchResult[];
}
