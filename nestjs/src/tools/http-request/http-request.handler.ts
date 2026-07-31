import { Injectable } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { ToolHandler, ToolHandlerDefinition } from '../tool-handler.types';

const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
const ALLOWED_HEADER_NAMES = new Set([
  'accept',
  'accept-language',
  'cache-control',
  'user-agent',
]);

@Injectable()
export class HttpRequestHandler implements ToolHandler {
  readonly definition: ToolHandlerDefinition = {
    name: 'http_request',
    description: '向公开 HTTP/HTTPS 地址发送 GET 请求，适合读取公开 API 或网页原始响应',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '公开 HTTP/HTTPS URL',
        },
        query: {
          type: 'object',
          description: '追加到 URL 上的查询参数',
          additionalProperties: {
            oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
          },
        },
        headers: {
          type: 'object',
          description: '可选请求头，仅允许 Accept、Accept-Language、Cache-Control、User-Agent',
          additionalProperties: { type: 'string' },
        },
        maxChars: {
          type: 'number',
          description: '最多返回字符数，默认 20000，最多 50000',
        },
      },
      required: ['url'],
    },
  };

  async execute(input: Record<string, unknown>) {
    const startedAt = Date.now();
    const url = parsePublicUrl(typeof input.url === 'string' ? input.url.trim() : '');
    appendQuery(url, input.query);
    await assertPublicHost(url.hostname);

    const maxChars =
      typeof input.maxChars === 'number' && Number.isFinite(input.maxChars)
        ? Math.max(1000, Math.min(50000, Math.floor(input.maxChars)))
        : 20000;
    const headers = normalizeHeaders(input.headers);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetchWithCheckedRedirects(url, headers, controller.signal);
      const contentType = response.headers.get('content-type') || '';
      const bodyResult = await readLimitedText(response, maxChars);
      const parsedJson = parseJsonIfPossible(bodyResult.text, contentType);

      return {
        url: response.url || url.toString(),
        status: response.status,
        ok: response.ok,
        contentType,
        durationMs: Date.now() - startedAt,
        body: parsedJson ?? bodyResult.text,
        bodyType: parsedJson === undefined ? 'text' : 'json',
        truncated: bodyResult.truncated,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function fetchWithCheckedRedirects(
  url: URL,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  let nextUrl = url;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(nextUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json,text/plain,text/html;q=0.9,*/*;q=0.5',
        'User-Agent': 'Xingyao-Agent-Platform/1.0',
        ...headers,
      },
      redirect: 'manual',
      signal,
    });

    if (!REDIRECT_STATUS_CODES.includes(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      return response;
    }

    nextUrl = parsePublicUrl(new URL(location, nextUrl).toString());
    await assertPublicHost(nextUrl.hostname);
  }

  throw new Error('Too many redirects');
}

async function readLimitedText(
  response: Response,
  maxChars: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    const text = await response.text();
    return { text: text.slice(0, maxChars), truncated: text.length > maxChars };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      text += decoder.decode();
      return { text, truncated: false };
    }

    text += decoder.decode(value, { stream: true });
    if (text.length > maxChars) {
      await reader.cancel();
      return { text: text.slice(0, maxChars), truncated: true };
    }
  }
}

function parsePublicUrl(value: string): URL {
  if (!value) {
    throw new Error('url is required');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('url must be a valid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('url protocol must be http or https');
  }

  return url;
}

function appendQuery(url: URL, query: unknown) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return;

  for (const [key, value] of Object.entries(query)) {
    if (!key.trim()) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      url.searchParams.set(key, String(value));
    }
  }
}

function normalizeHeaders(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const headers: Record<string, string> = {};
  for (const [name, rawHeaderValue] of Object.entries(value)) {
    const normalizedName = name.toLowerCase();
    if (!ALLOWED_HEADER_NAMES.has(normalizedName)) continue;
    if (typeof rawHeaderValue !== 'string') continue;
    const headerValue = rawHeaderValue.trim();
    if (!headerValue || headerValue.length > 500) continue;
    headers[name] = headerValue;
  }

  return headers;
}

async function assertPublicHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === 'localhost' || normalized.endsWith('.local')) {
    throw new Error('local network URLs are not allowed');
  }

  const addresses = await lookup(normalized, { all: true, verbatim: false });
  if (!addresses.length) {
    throw new Error(`Unable to resolve host: ${hostname}`);
  }

  for (const address of addresses) {
    if (!isPublicAddress(address.address)) {
      throw new Error('local network URLs are not allowed');
    }
  }
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    return !(
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80:')
    );
  }

  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [a, b] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function parseJsonIfPossible(text: string, contentType: string): unknown | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const looksLikeJson =
    contentType.toLowerCase().includes('json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');
  if (!looksLikeJson) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}
