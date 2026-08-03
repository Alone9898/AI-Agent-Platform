import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchProviderConfig, WebSearchRequest, WebSearchResponse } from '../web-search.types';

@Injectable()
export class BochaProvider implements WebSearchProvider {
  async search(
    request: WebSearchRequest,
    config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse> {
    if (!config.apiKey) throw new Error('博查 API Key 未配置');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('https://api.bochaai.com/v1/web-search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          freshness: 'noLimit',
          summary: true,
          count: request.maxResults ?? 5,
        }),
        signal: controller.signal,
      });

      const data: any = await response.json().catch(() => null);
      if (!response.ok || (typeof data?.code === 'number' && data.code !== 200)) {
        throw new Error(
          `博查搜索失败 (${response.status}): ${String(data?.msg || data?.message || response.statusText).slice(0, 300)}`,
        );
      }

      const values = Array.isArray(data?.data?.webPages?.value)
        ? data.data.webPages.value
        : [];
      return {
        provider: 'bocha',
        query: request.query,
        results: values
          .filter((item: any) => item?.name && isHttpUrl(item?.url))
          .slice(0, request.maxResults ?? 5)
          .map((item: any) => ({
            title: String(item.name),
            url: String(item.url),
            content: String(item.summary || item.snippet || '').trim() || undefined,
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
