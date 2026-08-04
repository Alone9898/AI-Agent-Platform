import { Injectable } from '@nestjs/common';
import { ToolSettingsService } from '../../tool-settings/tool-settings.service';
import { ToolHandler, ToolHandlerDefinition } from '../tool-handler.types';
import { BochaProvider } from './providers/bocha.provider';
import { BingProvider } from './providers/bing.provider';
import { DuckDuckGoProvider } from './providers/duckduckgo.provider';
import { ExaMcpProvider } from './providers/exa-mcp.provider';
import { SearxngProvider } from './providers/searxng.provider';
import { SerpApiProvider } from './providers/serpapi.provider';
import { TavilyProvider } from './providers/tavily.provider';

@Injectable()
export class WebSearchHandler implements ToolHandler {
  readonly definition: ToolHandlerDefinition = {
    name: 'web_search',
    description: '搜索互联网获取实时信息，返回相关网页的标题、URL 和摘要',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        maxResults: {
          type: 'number',
          description: '返回结果数量，默认 5，最多 10',
        },
      },
      required: ['query'],
    },
  };

  constructor(
    private readonly toolSettings: ToolSettingsService,
    private readonly bochaProvider: BochaProvider,
    private readonly bingProvider: BingProvider,
    private readonly duckDuckGoProvider: DuckDuckGoProvider,
    private readonly exaMcpProvider: ExaMcpProvider,
    private readonly tavilyProvider: TavilyProvider,
    private readonly searxngProvider: SearxngProvider,
    private readonly serpApiProvider: SerpApiProvider,
  ) {}

  async execute(input: Record<string, unknown>) {
    const query = typeof input.query === 'string' ? input.query.trim() : '';
    if (!query) {
      throw new Error('query is required');
    }

    const maxResults =
      typeof input.maxResults === 'number' && Number.isFinite(input.maxResults)
        ? Math.max(1, Math.min(10, Math.floor(input.maxResults)))
        : 5;

    const config = await this.toolSettings.getWebSearchRuntimeConfig();
    const provider = {
      bocha: this.bochaProvider,
      bing: this.bingProvider,
      duckduckgo: this.duckDuckGoProvider,
      exa_mcp: this.exaMcpProvider,
      tavily: this.tavilyProvider,
      searxng: this.searxngProvider,
      serpapi: this.serpApiProvider,
    }[config.provider];
    return provider.search({ query, maxResults }, config);
  }
}
