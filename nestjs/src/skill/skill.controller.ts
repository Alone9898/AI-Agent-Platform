import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SkillService } from './skill.service';

@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  findAll() { return this.skillService.findAll(); }

  @Get('presets')
  getPresets() { return this.skillService.getPresets(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.skillService.findOne(id); }

  @Post()
  create(@Body() body: { name: string; description?: string; type?: string; prompt?: string; tools?: string }) {
    return this.skillService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; description?: string; type?: string; prompt?: string; tools?: string }) {
    return this.skillService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.skillService.remove(id); }
}
