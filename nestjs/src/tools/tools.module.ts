import { Module } from '@nestjs/common';
import { CalculatorHandler } from './calculator/calculator.handler';
import { CurrentTimeHandler } from './current-time/current-time.handler';
import { HttpRequestHandler } from './http-request/http-request.handler';
import { ToolHandlerRegistry } from './tool-handler.registry';
import { TavilyProvider } from './web-search/providers/tavily.provider';
import { WebFetchHandler } from './web-fetch/web-fetch.handler';
import { WebSearchHandler } from './web-search/web-search.handler';

@Module({
  providers: [
    CalculatorHandler,
    CurrentTimeHandler,
    HttpRequestHandler,
    TavilyProvider,
    WebFetchHandler,
    WebSearchHandler,
    ToolHandlerRegistry,
  ],
  exports: [ToolHandlerRegistry],
})
export class ToolsModule {}
