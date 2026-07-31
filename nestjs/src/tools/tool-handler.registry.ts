import { Injectable } from '@nestjs/common';
import { CalculatorHandler } from './calculator/calculator.handler';
import { CurrentTimeHandler } from './current-time/current-time.handler';
import { HttpRequestHandler } from './http-request/http-request.handler';
import { ToolHandler, ToolHandlerDefinition } from './tool-handler.types';
import { WebFetchHandler } from './web-fetch/web-fetch.handler';
import { WebSearchHandler } from './web-search/web-search.handler';

@Injectable()
export class ToolHandlerRegistry {
  private readonly handlers = new Map<string, ToolHandler>();

  constructor(
    currentTimeHandler: CurrentTimeHandler,
    calculatorHandler: CalculatorHandler,
    httpRequestHandler: HttpRequestHandler,
    webSearchHandler: WebSearchHandler,
    webFetchHandler: WebFetchHandler,
  ) {
    for (const handler of [
      currentTimeHandler,
      calculatorHandler,
      httpRequestHandler,
      webSearchHandler,
      webFetchHandler,
    ]) {
      this.handlers.set(handler.definition.name, handler);
    }
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  getDefinition(name: string): ToolHandlerDefinition | undefined {
    return this.handlers.get(name)?.definition;
  }

  execute(name: string, input: Record<string, unknown>): Promise<unknown> | unknown {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Tool ${name} is not implemented`);
    }
    return handler.execute(input);
  }
}
