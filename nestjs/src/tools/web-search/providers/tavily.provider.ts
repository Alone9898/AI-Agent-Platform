import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchRequest, WebSearchResponse } from '../web-search.types';

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  query?: string;
  results?: TavilyResult[];
}

@Injectable()
export class TavilyProvider implements WebSearchProvider {
  async search(request: WebSearchRequest): Promise<WebSearchResponse> {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is required for web_search');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: request.query,
          search_depth: 'basic',
          max_results: request.maxResults ?? 5,
          include_answer: false,
          include_raw_content: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Tavily search failed with ${response.status}: ${detail.slice(0, 300)}`);
      }

      const data = (await response.json()) as TavilyResponse;
      return {
        query: data.query || request.query,
        results: (data.results || [])
          .filter((item) => item.title && item.url)
          .map((item) => ({
            title: item.title || '',
            url: item.url || '',
            content: item.content,
            score: item.score,
          })),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
