import { Injectable } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { ToolHandler, ToolHandlerDefinition } from '../tool-handler.types';

const ALLOWED_CONTENT_TYPES = [
  'text/html',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
];

@Injectable()
export class WebFetchHandler implements ToolHandler {
  readonly definition: ToolHandlerDefinition = {
    name: 'web_fetch',
    description: '读取公开网页内容，返回清洗后的文本摘要',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要读取的公开 HTTP/HTTPS 网页地址',
        },
        maxChars: {
          type: 'number',
          description: '最多返回字符数，默认 6000，最多 20000',
        },
      },
      required: ['url'],
    },
  };

  async execute(input: Record<string, unknown>) {
    const rawUrl = typeof input.url === 'string' ? input.url.trim() : '';
    const maxChars =
      typeof input.maxChars === 'number' && Number.isFinite(input.maxChars)
        ? Math.max(500, Math.min(20000, Math.floor(input.maxChars)))
        : 6000;
    const url = parsePublicUrl(rawUrl);
    await assertPublicHost(url.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetchWithCheckedRedirects(url, controller.signal);

      const contentType = response.headers.get('content-type') || '';
      if (!ALLOWED_CONTENT_TYPES.some((type) => contentType.toLowerCase().includes(type))) {
        throw new Error(`Unsupported content type: ${contentType || 'unknown'}`);
      }

      const body = await response.text();
      const title = extractTitle(body);
      const text = cleanText(body, contentType);
      const clipped = text.slice(0, maxChars);

      return {
        url: response.url || url.toString(),
        status: response.status,
        contentType,
        title,
        text: clipped,
        truncated: text.length > clipped.length,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function fetchWithCheckedRedirects(url: URL, signal: AbortSignal): Promise<Response> {
  let nextUrl = url;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(nextUrl.toString(), {
      headers: {
        Accept: 'text/html,text/plain,application/json,application/xml,text/xml;q=0.9,*/*;q=0.5',
        'User-Agent': 'Xingyao-Agent-Platform/1.0',
      },
      redirect: 'manual',
      signal,
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
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

async function assertPublicHost(hostname: string) {
  const normalized = hostname.toLowerCase();
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
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function extractTitle(body: string): string | undefined {
  const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1]).replace(/\s+/g, ' ').trim() : undefined;
}

function cleanText(body: string, contentType: string): string {
  if (!contentType.toLowerCase().includes('html')) {
    return body.replace(/\s+/g, ' ').trim();
  }

  return decodeHtml(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
