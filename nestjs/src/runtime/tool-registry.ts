import { Injectable } from '@nestjs/common';
import { ToolExecutor } from './tool-executor';
import { RuntimeToolDefinition } from './runtime.types';

interface StoredToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  scriptPath?: string;
  timeoutMs?: number;
}

interface RegisteredTool {
  definition: RuntimeToolDefinition;
  config: StoredToolDefinition;
}

@Injectable()
export class ToolRegistry {
  constructor(private readonly toolExecutor: ToolExecutor) {}

  resolve(serializedTools: Array<string | null>): RegisteredTool[] {
    const registered = new Map<string, RegisteredTool>();
    for (const serialized of serializedTools) {
      for (const tool of parseTools(serialized)) {
        if (!isSupported(tool)) continue;
        registered.set(tool.name, {
          config: tool,
          definition: {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters || { type: 'object', properties: {} },
            },
          },
        });
      }
    }
    return [...registered.values()];
  }

  async execute(tool: RegisteredTool, input: Record<string, unknown>): Promise<unknown> {
    if (tool.config.name === 'get_current_time') {
      const timezone =
        typeof input.timezone === 'string' && input.timezone.trim()
          ? input.timezone.trim()
          : Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      let formatted: string;
      try {
        formatted = new Intl.DateTimeFormat('zh-CN', {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone: timezone,
        }).format(now);
      } catch {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
      return { iso: now.toISOString(), timezone, formatted };
    }

    if (tool.config.name === 'calculator') {
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

    if (tool.config.scriptPath) {
      const result = await this.toolExecutor.execute({
        scriptPath: tool.config.scriptPath,
        input,
        timeoutMs: tool.config.timeoutMs,
      });
      return result.output;
    }

    throw new Error(`Tool ${tool.config.name} is not implemented`);
  }
}

function parseTools(serialized: string | null): StoredToolDefinition[] {
  if (!serialized) return [];
  try {
    const value = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is StoredToolDefinition =>
        !!item && typeof item.name === 'string' && item.name.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function isSupported(tool: StoredToolDefinition): boolean {
  return (
    tool.name === 'get_current_time' ||
    tool.name === 'calculator' ||
    typeof tool.scriptPath === 'string'
  );
}
