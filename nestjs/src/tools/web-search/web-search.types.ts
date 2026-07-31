export interface WebSearchRequest {
  query: string;
  maxResults?: number;
}

export interface WebSearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
}
