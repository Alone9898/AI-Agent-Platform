import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchProviderConfig, WebSearchRequest, WebSearchResponse } from '../web-search.types';

@Injectable()
export class SerpApiProvider implements WebSearchProvider {
  async search(
    request: WebSearchRequest,
    config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse> {
    if (!config.apiKey) throw new Error('SerpAPI API Key 未配置');
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', request.query);
    url.searchParams.set('num', String(request.maxResults ?? 5));
    url.searchParams.set('api_key', config.apiKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data: any = await response.json().catch(() => null);
      if (!response.ok || data?.error) {
        const detail = String(data?.error || response.statusText).slice(0, 300);
        if (response.status === 401 || response.status === 403 || /credit|quota|plan|limit/i.test(detail)) {
          throw new Error('SerpAPI Key 无效或套餐额度不足，请检查账户额度后重试');
        }
        throw new Error(`SerpAPI 搜索失败 (${response.status}): ${detail}`);
      }
      const values = Array.isArray(data?.organic_results) ? data.organic_results : [];
      return {
        provider: 'serpapi',
        query: request.query,
        results: values
          .filter((item: any) => item?.title && item?.link)
          .slice(0, request.maxResults ?? 5)
          .map((item: any) => ({
            title: String(item.title),
            url: String(item.link),
            content: String(item.snippet || '').trim() || undefined,
            score: typeof item.position === 'number' ? 1 / item.position : undefined,
          })),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
