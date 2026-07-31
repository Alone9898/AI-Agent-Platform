import { Injectable } from '@nestjs/common';
import { ToolHandler, ToolHandlerDefinition } from '../tool-handler.types';

@Injectable()
export class CurrentTimeHandler implements ToolHandler {
  readonly definition: ToolHandlerDefinition = {
    name: 'get_current_time',
    description: '获取当前的日期、时间和时区信息',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: '时区，如 Asia/Shanghai，默认使用服务端本地时区',
        },
      },
    },
  };

  execute(input: Record<string, unknown>) {
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
}
