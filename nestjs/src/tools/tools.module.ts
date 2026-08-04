import { Module } from '@nestjs/common';
import { ToolSettingsModule } from '../tool-settings/tool-settings.module';
import { CalculatorHandler } from './calculator/calculator.handler';
import { CurrentTimeHandler } from './current-time/current-time.handler';
import { HttpRequestHandler } from './http-request/http-request.handler';
import { ToolHandlerRegistry } from './tool-handler.registry';
import { BochaProvider } from './web-search/providers/bocha.provider';
import { BingProvider } from './web-search/providers/bing.provider';
import { DuckDuckGoProvider } from './web-search/providers/duckduckgo.provider';
import { ExaMcpProvider } from './web-search/providers/exa-mcp.provider';
import { SearxngProvider } from './web-search/providers/searxng.provider';
import { SerpApiProvider } from './web-search/providers/serpapi.provider';
import { TavilyProvider } from './web-search/providers/tavily.provider';
import { WebFetchHandler } from './web-fetch/web-fetch.handler';
import { WebSearchHandler } from './web-search/web-search.handler';

@Module({
  imports: [ToolSettingsModule],
  providers: [
    BochaProvider,
    BingProvider,
    CalculatorHandler,
    CurrentTimeHandler,
    DuckDuckGoProvider,
    ExaMcpProvider,
    HttpRequestHandler,
    SearxngProvider,
    SerpApiProvider,
    TavilyProvider,
    WebFetchHandler,
    WebSearchHandler,
    ToolHandlerRegistry,
  ],
  exports: [ToolHandlerRegistry],
})
export class ToolsModule {}
