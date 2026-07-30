import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentRuntime } from './agent-runtime';
import { MemoryService } from './memory.service';
import { ModelClient } from './model-client';
import { ToolExecutor } from './tool-executor';
import { ToolRegistry } from './tool-registry';

@Module({
  providers: [
    PrismaService,
    AgentRuntime,
    MemoryService,
    ModelClient,
    ToolExecutor,
    ToolRegistry,
  ],
  exports: [AgentRuntime],
})
export class RuntimeModule {}
