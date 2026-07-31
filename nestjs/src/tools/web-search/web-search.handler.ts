import { Injectable } from '@nestjs/common';
import { ToolHandler, ToolHandlerDefinition } from '../tool-handler.types';
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

  constructor(private readonly provider: TavilyProvider) {}

  async execute(input: Record<string, unknown>) {
    const query = typeof input.query === 'string' ? input.query.trim() : '';
    if (!query) {
      throw new Error('query is required');
    }

    const maxResults =
      typeof input.maxResults === 'number' && Number.isFinite(input.maxResults)
        ? Math.max(1, Math.min(10, Math.floor(input.maxResults)))
        : 5;

    return this.provider.search({ query, maxResults });
  }
}
