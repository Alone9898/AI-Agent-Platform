const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

export async function fetchPublicSearchHtml(url: string, providerName: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error(`${providerName}公共搜索通道已被限流，请稍后重试或切换其他服务商`);
      }
      throw new Error(`${providerName}公共搜索失败 (${response.status})`);
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${providerName}公共搜索请求超时，请切换其他服务商`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractAttribute(attributes: string, name: string): string {
  const match = attributes.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

export function cleanHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function decodeHtml(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return safeCharacter(Number.parseInt(code.slice(2), 16), entity);
    }
    if (code.startsWith('#')) {
      return safeCharacter(Number.parseInt(code.slice(1), 10), entity);
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

export function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function safeCharacter(codePoint: number, fallback: string): string {
  try {
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : fallback;
  } catch {
    return fallback;
  }
}
