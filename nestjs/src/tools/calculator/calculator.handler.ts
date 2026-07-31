import { Injectable } from '@nestjs/common';
import { ToolHandler, ToolHandlerDefinition } from '../tool-handler.types';

@Injectable()
export class CalculatorHandler implements ToolHandler {
  readonly definition: ToolHandlerDefinition = {
    name: 'calculator',
    description: '执行数学表达式计算，支持四则运算、括号和幂运算',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，如 "2 + 3 * 4"',
        },
      },
      required: ['expression'],
    },
  };

  execute(input: Record<string, unknown>) {
    const expression = typeof input.expression === 'string' ? input.expression.trim() : '';
    if (!expression || expression.length > 200) {
      throw new Error('expression must be between 1 and 200 characters');
    }
    if (!/^[0-9+\-*/%().\s^]+$/.test(expression)) {
      throw new Error('expression contains unsupported characters');
    }

    const normalized = expression.replace(/\^/g, '**');
    const result = Function(`"use strict"; return (${normalized});`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('expression did not produce a finite number');
    }

    return { expression, result };
  }
}
