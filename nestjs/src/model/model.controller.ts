import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ModelService } from './model.service';

@Controller('models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get()
  findAll() { return this.modelService.findAll(); }

  @Get('presets/providers')
  getProviderPresets() { return this.modelService.getProviderPresets(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.modelService.findOne(id); }

  @Post()
  create(@Body() body: { name: string; provider?: string; providerKey?: string; modelName: string; baseUrl?: string; apiKeyValue?: string }) {
    return this.modelService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; provider?: string; providerKey?: string; modelName?: string; baseUrl?: string; apiKeyValue?: string }) {
    return this.modelService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.modelService.remove(id); }
}
