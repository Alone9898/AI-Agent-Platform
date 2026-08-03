import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ToolSettingsService } from './tool-settings.service';

@Controller('tool-settings')
export class ToolSettingsController {
  constructor(private readonly toolSettings: ToolSettingsService) {}

  @Get('web-search/providers')
  getWebSearchProviders() {
    return this.toolSettings.getProviders();
  }

  @Get('web-search')
  getWebSearchConfig() {
    return this.toolSettings.getWebSearchConfig();
  }

  @Put('web-search')
  saveWebSearchConfig(
    @Body() body: { provider: string; apiKey?: string; baseUrl?: string },
  ) {
    return this.toolSettings.saveWebSearchConfig(body);
  }

  @Delete('web-search')
  clearWebSearchConfig() {
    return this.toolSettings.clearWebSearchConfig();
  }
}
