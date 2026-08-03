import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalSecretService } from './local-secret.service';
import {
  WEB_SEARCH_PROVIDERS,
  WebSearchProviderKey,
  WebSearchPublicConfig,
  WebSearchRuntimeConfig,
} from './tool-settings.types';

const WEB_SEARCH_SETTING_KEY = 'web-search';

interface ToolSettingRow {
  key: string;
  provider: string;
  base_url: string | null;
  api_key_encrypted: string | null;
}

@Injectable()
export class ToolSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: LocalSecretService,
  ) {}

  getProviders() {
    return WEB_SEARCH_PROVIDERS;
  }

  async getWebSearchConfig(): Promise<WebSearchPublicConfig> {
    const setting = await this.getSetting();
    if (setting) {
      return this.toPublicConfig(
        setting.provider as WebSearchProviderKey,
        setting.base_url,
        Boolean(setting.api_key_encrypted),
        'local',
      );
    }

    const environmentConfig = this.readEnvironmentConfig();
    if (environmentConfig) {
      return this.toPublicConfig(
        environmentConfig.provider,
        environmentConfig.baseUrl || null,
        Boolean(environmentConfig.apiKey),
        'environment',
      );
    }

    return {
      provider: null,
      baseUrl: null,
      hasApiKey: false,
      configured: false,
      source: 'none',
    };
  }

  async getWebSearchRuntimeConfig(): Promise<WebSearchRuntimeConfig> {
    const setting = await this.getSetting();
    if (!setting) {
      const environmentConfig = this.readEnvironmentConfig();
      if (environmentConfig) return environmentConfig;
      throw new Error('联网搜索尚未配置，请在系统设置中选择搜索服务商并填写凭据');
    }

    const provider = validateProvider(setting.provider);
    const apiKey = setting.api_key_encrypted
      ? await this.secrets.decrypt(setting.api_key_encrypted)
      : undefined;
    const config = {
      provider,
      apiKey,
      baseUrl: setting.base_url || undefined,
    };
    assertCompleteConfig(config);
    return config;
  }

  async saveWebSearchConfig(input: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
  }): Promise<WebSearchPublicConfig> {
    const provider = validateProvider(input.provider);
    const existing = await this.getSetting();
    const suppliedApiKey = input.apiKey?.trim();
    const canReuseApiKey = existing?.provider === provider && existing.api_key_encrypted;
    const apiKeyEncrypted = suppliedApiKey
      ? await this.secrets.encrypt(suppliedApiKey)
      : canReuseApiKey
        ? existing.api_key_encrypted
        : null;
    const baseUrl = provider === 'searxng' ? normalizeBaseUrl(input.baseUrl) : null;

    assertCompleteConfig({
      provider,
      apiKey: apiKeyEncrypted ? 'configured' : undefined,
      baseUrl: baseUrl || undefined,
    });

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO tool_settings (
        key, provider, base_url, api_key_encrypted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        provider = excluded.provider,
        base_url = excluded.base_url,
        api_key_encrypted = excluded.api_key_encrypted,
        updated_at = CURRENT_TIMESTAMP`,
      WEB_SEARCH_SETTING_KEY,
      provider,
      baseUrl,
      apiKeyEncrypted,
    );
    return this.getWebSearchConfig();
  }

  async clearWebSearchConfig(): Promise<WebSearchPublicConfig> {
    await this.prisma.$executeRawUnsafe(
      'DELETE FROM tool_settings WHERE key = ?',
      WEB_SEARCH_SETTING_KEY,
    );
    return this.getWebSearchConfig();
  }

  private async getSetting(): Promise<ToolSettingRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<ToolSettingRow[]>(
      `SELECT key, provider, base_url, api_key_encrypted
       FROM tool_settings
       WHERE key = ?
       LIMIT 1`,
      WEB_SEARCH_SETTING_KEY,
    );
    return rows[0] || null;
  }

  private readEnvironmentConfig(): WebSearchRuntimeConfig | null {
    const legacyTavilyKey = process.env.TAVILY_API_KEY?.trim();
    const providerValue = process.env.WEB_SEARCH_PROVIDER?.trim();
    const apiKey = process.env.WEB_SEARCH_API_KEY?.trim() || legacyTavilyKey;
    const baseUrl = process.env.WEB_SEARCH_BASE_URL?.trim();

    if (!providerValue && legacyTavilyKey) {
      return { provider: 'tavily', apiKey: legacyTavilyKey };
    }
    if (!providerValue) return null;

    const provider = validateProvider(providerValue);
    const config = { provider, apiKey, baseUrl };
    assertCompleteConfig(config);
    return config;
  }

  private toPublicConfig(
    provider: WebSearchProviderKey,
    baseUrl: string | null,
    hasApiKey: boolean,
    source: 'local' | 'environment',
  ): WebSearchPublicConfig {
    const configured =
      provider === 'searxng' ? Boolean(baseUrl) : hasApiKey;
    return { provider, baseUrl, hasApiKey, configured, source };
  }
}

function validateProvider(value: string): WebSearchProviderKey {
  if (WEB_SEARCH_PROVIDERS.some((provider) => provider.key === value)) {
    return value as WebSearchProviderKey;
  }
  throw new BadRequestException('不支持的联网搜索服务商');
}

function normalizeBaseUrl(value?: string): string | null {
  const normalized = value?.trim().replace(/\/+$/, '') || '';
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString().replace(/\/+$/, '');
  } catch {
    throw new BadRequestException('SearXNG 地址必须是有效的 HTTP/HTTPS URL');
  }
}

function assertCompleteConfig(config: WebSearchRuntimeConfig) {
  if ((config.provider === 'bocha' || config.provider === 'tavily') && !config.apiKey) {
    throw new BadRequestException('所选搜索服务商需要 API Key');
  }
  if (config.provider === 'searxng' && !config.baseUrl) {
    throw new BadRequestException('SearXNG 需要填写服务地址');
  }
}
