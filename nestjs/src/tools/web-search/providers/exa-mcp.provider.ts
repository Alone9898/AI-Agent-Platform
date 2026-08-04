import { Injectable } from '@nestjs/common';
import { WebSearchProvider } from '../web-search.provider';
import { WebSearchProviderConfig, WebSearchRequest, WebSearchResponse } from '../web-search.types';

const EXA_MCP_URL = 'https://mcp.exa.ai/mcp';
const MCP_PROTOCOL_VERSION = '2025-03-26';

@Injectable()
export class ExaMcpProvider implements WebSearchProvider {
  async search(
    request: WebSearchRequest,
    _config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse> {
    let sessionId = '';
    try {
      const initialized = await sendMcpRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'xingyao-agent-platform', version: '1.0.0' },
        },
      });
      sessionId = initialized.sessionId;
      if (!sessionId) throw new Error('Exa MCP 未返回会话标识');

      await sendMcpRequest(
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        sessionId,
        false,
      );
      const response = await sendMcpRequest(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'web_search_exa',
            arguments: {
              query: request.query,
              numResults: request.maxResults ?? 5,
            },
          },
        },
        sessionId,
      );
      const errorMessage = response.data?.error?.message;
      if (errorMessage) throw new Error(`Exa MCP 搜索失败: ${errorMessage}`);
      if (response.data?.result?.isError) {
        throw new Error(`Exa MCP 搜索失败: ${extractMcpText(response.data.result) || '公共通道暂不可用'}`);
      }
      const results = parseExaResults(extractMcpText(response.data?.result)).slice(
        0,
        request.maxResults ?? 5,
      );
      if (!results.length) {
        throw new Error('Exa MCP 公共搜索未返回可用结果，可能已达到匿名额度');
      }
      return { provider: 'exa_mcp', query: request.query, results };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Exa MCP 公共搜索请求超时，请切换其他服务商');
      }
      throw error;
    } finally {
      if (sessionId) void closeMcpSession(sessionId);
    }
  }
}

async function sendMcpRequest(
  body: Record<string, unknown>,
  sessionId = '',
  expectResponse = true,
): Promise<{ data: any; sessionId: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(EXA_MCP_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...(sessionId
          ? {
              'Mcp-Session-Id': sessionId,
              'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
            }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error('Exa MCP 匿名额度不足或公共通道已限流，请稍后重试或切换服务商');
      }
      throw new Error(`Exa MCP 请求失败 (${response.status})`);
    }
    const nextSessionId = response.headers.get('mcp-session-id') || sessionId;
    if (!expectResponse) return { data: null, sessionId: nextSessionId };
    return { data: parseMcpPayload(await response.text()), sessionId: nextSessionId };
  } finally {
    clearTimeout(timeout);
  }
}

async function closeMcpSession(sessionId: string) {
  try {
    await fetch(EXA_MCP_URL, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
        'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
      },
    });
  } catch {
  }
}

function parseMcpPayload(value: string): any {
  const dataLines = value
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());
  const payload = dataLines.at(-1) || value.trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    throw new Error('Exa MCP 返回了无法解析的数据');
  }
}

function extractMcpText(result: any): string {
  return Array.isArray(result?.content)
    ? result.content
        .filter((item: any) => item?.type === 'text' && typeof item.text === 'string')
        .map((item: any) => item.text)
        .join('\n\n')
    : '';
}

function parseExaResults(value: string) {
  return value
    .split(/\n---\n/g)
    .map((section) => {
      const title = section.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || '';
      const url = section.match(/^URL:\s*(https?:\/\/\S+)$/m)?.[1]?.trim() || '';
      const highlights = section.split(/\nHighlights:\s*\n/i)[1]?.trim() || '';
      return {
        title,
        url,
        content: highlights.replace(/\s+/g, ' ').slice(0, 700) || undefined,
      };
    })
    .filter((item) => item.title && item.url);
}
