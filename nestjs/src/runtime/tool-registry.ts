import { Injectable } from '@nestjs/common';
import { ToolHandlerRegistry } from '../tools';
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
  constructor(
    private readonly toolExecutor: ToolExecutor,
    private readonly toolHandlers: ToolHandlerRegistry,
  ) {}

  resolve(serializedTools: Array<string | null>): RegisteredTool[] {
    const registered = new Map<string, RegisteredTool>();
    for (const serialized of serializedTools) {
      for (const tool of parseTools(serialized)) {
        if (!this.isSupported(tool)) continue;
        const handlerDefinition = this.toolHandlers.getDefinition(tool.name);
        registered.set(tool.name, {
          config: tool,
          definition: {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description || handlerDefinition?.description,
              parameters:
                tool.parameters ||
                handlerDefinition?.parameters ||
                { type: 'object', properties: {} },
            },
          },
        });
      }
    }
    return [...registered.values()];
  }

  async execute(tool: RegisteredTool, input: Record<string, unknown>): Promise<unknown> {
    if (this.toolHandlers.has(tool.config.name)) {
      return this.toolHandlers.execute(tool.config.name, input);
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

  private isSupported(tool: StoredToolDefinition): boolean {
    return this.toolHandlers.has(tool.name) || typeof tool.scriptPath === 'string';
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
