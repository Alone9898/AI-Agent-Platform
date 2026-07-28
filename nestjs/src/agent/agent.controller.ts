import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  findAll() {
    return this.agentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agentService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; description?: string; systemPrompt?: string }) {
    return this.agentService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; systemPrompt?: string },
  ) {
    return this.agentService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agentService.remove(id);
  }

  @Post(':id/skills')
  bindSkills(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { skillIds: number[] },
  ) {
    return this.agentService.bindSkills(id, body.skillIds);
  }

  @Post(':id/model')
  bindModel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { modelId: number },
  ) {
    return this.agentService.bindModel(id, body.modelId);
  }
}
