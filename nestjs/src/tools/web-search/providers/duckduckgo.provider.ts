import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchProviderConfig, WebSearchRequest, WebSearchResponse } from '../web-search.types';
import {
  cleanHtml,
  extractAttribute,
  fetchPublicSearchHtml,
  isHttpUrl,
} from './public-search.utils';

@Injectable()
export class DuckDuckGoProvider implements WebSearchProvider {
  async search(
    request: WebSearchRequest,
    _config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse> {
    const maxResults = request.maxResults ?? 5;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(request.query)}`;
    const html = await fetchPublicSearchHtml(url, 'DuckDuckGo');
    const results = [];
    const pattern = /<a\b([^>]*\bclass=["'][^"']*\bresult__a\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && results.length < maxResults) {
      const rawUrl = extractAttribute(match[1], 'href');
      const resultUrl = resolveDuckDuckGoUrl(rawUrl);
      const title = cleanHtml(match[2]);
      if (!title || !resultUrl) continue;
      const nearby = html.slice(pattern.lastIndex, pattern.lastIndex + 2400);
      const snippet = nearby.match(
        /<(?:a|div)[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i,
      );
      results.push({
        title,
        url: resultUrl,
        content: snippet ? cleanHtml(snippet[1]).slice(0, 700) || undefined : undefined,
      });
    }
    if (!results.length) {
      throw new Error('DuckDuckGo 公共搜索未返回结果，可能被限流或当前网络无法访问');
    }
    return { provider: 'duckduckgo', query: request.query, results };
  }
}

function resolveDuckDuckGoUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, 'https://duckduckgo.com');
    const target = url.searchParams.get('uddg');
    const resolved = target ? decodeURIComponent(target) : url.toString();
    return isHttpUrl(resolved) ? resolved : '';
  } catch {
    return '';
  }
}
