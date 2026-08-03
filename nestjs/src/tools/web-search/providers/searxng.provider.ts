import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchProviderConfig, WebSearchRequest, WebSearchResponse } from '../web-search.types';

@Injectable()
export class SearxngProvider implements WebSearchProvider {
  async search(
    request: WebSearchRequest,
    config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse> {
    if (!config.baseUrl) throw new Error('SearXNG 服务地址未配置');

    const url = new URL(`${config.baseUrl.replace(/\/+$/, '')}/search`);
    url.searchParams.set('q', request.query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('language', 'all');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        signal: controller.signal,
      });
      const data: any = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          `SearXNG 搜索失败 (${response.status}): ${String(data?.message || response.statusText).slice(0, 300)}`,
        );
      }

      const results = Array.isArray(data?.results) ? data.results : [];
      return {
        provider: 'searxng',
        query: data?.query || request.query,
        results: results
          .filter((item: any) => item?.title && isHttpUrl(item?.url))
          .slice(0, request.maxResults ?? 5)
          .map((item: any) => ({
            title: String(item.title),
            url: String(item.url),
            content: String(item.content || '').trim() || undefined,
            score: typeof item.score === 'number' ? item.score : undefined,
          })),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
