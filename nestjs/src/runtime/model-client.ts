import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  RuntimeModelMessage,
  RuntimeToolCall,
  RuntimeToolDefinition,
} from './runtime.types';

export interface ModelCompletionRequest {
  baseUrl: string;
  apiKey: string;
  providerKey?: string | null;
  modelName: string;
  messages: RuntimeModelMessage[];
  tools?: RuntimeToolDefinition[];
}

export interface ModelCompletionResult {
  content: string;
  toolCalls: RuntimeToolCall[];
  resolvedModel: string;
}

@Injectable()
export class ModelClient {
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const providerKey = request.providerKey?.toLowerCase() || '';
    if (providerKey === 'anthropic' || providerKey === 'google') {
      throw new BadGatewayException(
        `Provider ${providerKey} does not use the OpenAI-compatible chat protocol.`,
      );
    }

    const endpoint = joinUrl(request.baseUrl, 'chat/completions');
    const resolvedModel = resolveModelAlias(providerKey, request.modelName);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: request.messages,
          temperature: 0.7,
          ...(request.tools?.length
            ? { tools: request.tools, tool_choice: 'auto' }
            : {}),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Model request timed out after 90 seconds.'
          : `Unable to connect to model API: ${toErrorMessage(error)}`;
      throw new BadGatewayException(message);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Model API returned ${response.status}: ${truncate(responseText || response.statusText, 1000)}`,
      );
    }

    const data: any = await response.json().catch(() => null);
    const message = data?.choices?.[0]?.message;
    const content = normalizeContent(message?.content ?? data?.content ?? data?.reply);
    const toolCalls = normalizeToolCalls(message?.tool_calls);

    if (!content && toolCalls.length === 0) {
      throw new BadGatewayException('Model API returned an empty response.');
    }

    return { content, toolCalls, resolvedModel };
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function resolveModelAlias(providerKey: string, modelName: string): string {
  if (providerKey !== 'deepseek') return modelName;

  const aliases: Record<string, string> = {
    'deepseek-v4': 'deepseek-chat',
    'deepseek-v3': 'deepseek-chat',
    'deepseek-r2': 'deepseek-reasoner',
    'deepseek-r1': 'deepseek-reasoner',
  };
  return aliases[modelName.toLowerCase()] || modelName;
}

function normalizeContent(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => (typeof item?.text === 'string' ? item.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function normalizeToolCalls(value: unknown): RuntimeToolCall[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.function?.name === 'string',
    )
    .map((item) => ({
      id: item.id,
      type: 'function' as const,
      function: {
        name: item.function.name,
        arguments:
          typeof item.function.arguments === 'string'
            ? item.function.arguments
            : JSON.stringify(item.function.arguments ?? {}),
      },
    }));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit)}…`;
}
