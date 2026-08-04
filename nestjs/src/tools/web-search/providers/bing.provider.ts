import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchProviderConfig, WebSearchRequest, WebSearchResponse } from '../web-search.types';
import { cleanHtml, fetchPublicSearchHtml, isHttpUrl } from './public-search.utils';

@Injectable()
export class BingProvider implements WebSearchProvider {
  async search(
    request: WebSearchRequest,
    _config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse> {
    const maxResults = request.maxResults ?? 5;
    const url = new URL('https://www.bing.com/search');
    url.searchParams.set('q', request.query);
    url.searchParams.set('count', String(maxResults));
    url.searchParams.set('setlang', 'zh-Hans');
    const html = await fetchPublicSearchHtml(url.toString(), 'Bing');
    const results = [];
    const pattern = /<li[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && results.length < maxResults) {
      const link = match[1].match(/<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!link || !isHttpUrl(link[1])) continue;
      const title = cleanHtml(link[2]);
      if (!title) continue;
      const snippet = match[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      results.push({
        title,
        url: link[1],
        content: snippet ? cleanHtml(snippet[1]).slice(0, 700) || undefined : undefined,
      });
    }
    if (!results.length) {
      throw new Error('Bing 公共搜索未返回结果，可能被限流或搜索页面结构已变化');
    }
    return { provider: 'bing', query: request.query, results };
  }
}
